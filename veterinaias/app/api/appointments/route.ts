import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { appointmentSchema } from '@/lib/validations/appointment'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'

const VALID_TABS = ['hoy', 'proximas', 'confirmar'] as const
const ONE_DAY_MS = 86_400_000

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tab = req.nextUrl.searchParams.get('tab') ?? 'hoy'
  const fromRaw = req.nextUrl.searchParams.get('from')
  const toRaw   = req.nextUrl.searchParams.get('to')

  const useRange = fromRaw !== null && toRaw !== null

  let validatedFrom: string | null = null
  let validatedTo: string | null = null

  if (useRange) {
    const rangeResult = z.object({
      from: z.string().datetime({ message: 'from debe ser ISO 8601' }),
      to:   z.string().datetime({ message: 'to debe ser ISO 8601' }),
    }).safeParse({ from: fromRaw, to: toRaw })

    if (!rangeResult.success) {
      return NextResponse.json({ error: rangeResult.error.issues[0].message }, { status: 400 })
    }

    const fromDate = new Date(rangeResult.data.from)
    const toDate   = new Date(rangeResult.data.to)
    const diffDays = (toDate.getTime() - fromDate.getTime()) / 86_400_000

    if (diffDays <= 0) {
      return NextResponse.json({ error: 'from debe ser anterior a to' }, { status: 400 })
    }
    if (diffDays > 92) {
      return NextResponse.json({ error: 'El rango no puede superar 92 días' }, { status: 400 })
    }

    validatedFrom = rangeResult.data.from
    validatedTo   = rangeResult.data.to
  }

  if (!useRange && !VALID_TABS.includes(tab as typeof VALID_TABS[number])) {
    return NextResponse.json({ error: 'Tab inválido' }, { status: 400 })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + ONE_DAY_MS)
  const in8Days = new Date(todayStart.getTime() + 8 * ONE_DAY_MS)
  const in2DaysFromNow = new Date(now.getTime() + 2 * ONE_DAY_MS)

  let query = (supabase.from('appointments') as any)
    .select(`
      id, status, scheduled_at, duration_minutes, reason, notes, service_type,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .eq('tenant_id', profile.tenant_id)

  if (useRange && validatedFrom && validatedTo) {
    query = query
      .gte('scheduled_at', validatedFrom)
      .lte('scheduled_at', validatedTo)
  } else if (tab === 'hoy') {
    query = query
      .gte('scheduled_at', todayStart.toISOString())
      .lt('scheduled_at', tomorrowStart.toISOString())
  } else if (tab === 'proximas') {
    query = query
      .gte('scheduled_at', tomorrowStart.toISOString())
      .lt('scheduled_at', in8Days.toISOString())
  } else {
    // confirmar: rolling 2-day window from now, only scheduled
    query = query
      .gte('scheduled_at', now.toISOString())
      .lt('scheduled_at', in2DaysFromNow.toISOString())
      .eq('status', 'scheduled')
  }

  query = query.order('scheduled_at', { ascending: true })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (profileError) return NextResponse.json({ error: 'Error al verificar el perfil' }, { status: 500 })
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { data: tenantData } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', profile.tenant_id)
    .single()

  const businessHours = (tenantData?.settings as any)?.business_hours ?? DEFAULT_BUSINESS_HOURS
  const slotInterval: number = businessHours.slot_interval

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { force = false, ...appointmentBody } = body as Record<string, unknown>

  const result = appointmentSchema.safeParse(appointmentBody)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  // Conflict check — skip if vet explicitly confirmed
  if (!force) {
    const { data: conflicts } = await (supabase.from('appointments') as any)
      .select('id, scheduled_at, pet:pet_id(name), owner:owner_id(full_name)')
      .eq('tenant_id', profile.tenant_id)
      .eq('scheduled_at', result.data.scheduled_at)
      .not('status', 'in', '("cancelled","no_show")')
      .limit(3)

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({
        conflict: true,
        message: 'Ya existe una cita en ese horario',
        appointments: conflicts.map((c: any) => ({
          id: c.id,
          pet_name: c.pet?.name ?? '—',
          owner_name: c.owner?.full_name ?? '—',
          scheduled_at: c.scheduled_at,
        })),
      }, { status: 409 })
    }
  }

  const { grooming_services, ...appointmentData } = result.data

  const { data, error } = await (supabase.from('appointments') as any)
    .insert({
      ...appointmentData,
      duration_minutes: result.data.duration_minutes ?? slotInterval,
      tenant_id: profile.tenant_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (appointmentData.service_type === 'grooming' && grooming_services && grooming_services.length > 0) {
    const { error: svcError } = await (supabase.from('appointment_grooming_services') as any)
      .insert(grooming_services.map(s => ({
        appointment_id: data.id,
        service_catalog_id: s.service_catalog_id ?? null,
        service_name: s.service_name,
      })))
    if (svcError) {
      await (supabase.from('appointments') as any).delete().eq('id', data.id)
      return NextResponse.json({ error: 'Error al guardar los servicios de la cita' }, { status: 500 })
    }
  }

  return NextResponse.json({ data }, { status: 201 })
}
