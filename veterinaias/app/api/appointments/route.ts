import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { appointmentSchema } from '@/lib/validations/appointment'

const VALID_TABS = ['hoy', 'proximas', 'confirmar'] as const
const ONE_DAY_MS = 86_400_000

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tab = req.nextUrl.searchParams.get('tab') ?? 'hoy'
  if (!VALID_TABS.includes(tab as typeof VALID_TABS[number])) {
    return NextResponse.json({ error: 'Tab inválido' }, { status: 400 })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + ONE_DAY_MS)
  const in8Days = new Date(todayStart.getTime() + 8 * ONE_DAY_MS)
  const in2DaysFromNow = new Date(now.getTime() + 2 * ONE_DAY_MS)

  let query = (supabase.from('appointments') as any)
    .select(`
      id, status, scheduled_at, duration_minutes, reason, notes,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .order('scheduled_at', { ascending: true })

  if (tab === 'hoy') {
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

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = appointmentSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase.from('appointments') as any)
    .insert({
      ...result.data,
      tenant_id: profile.tenant_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
