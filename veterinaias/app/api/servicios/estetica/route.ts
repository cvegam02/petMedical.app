import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groomingSessionSchema } from '@/lib/validations/grooming'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const appointmentId = searchParams.get('appointmentId')

  // Single-session lookup by appointment_id (used by the appointment dialog)
  if (appointmentId) {
    const { data, error } = await (supabase as any)
      .from('grooming_sessions')
      .select(`
        id, session_date, notes, created_at, started_at, ended_at,
        services:grooming_session_services(id, service_name)
      `)
      .eq('tenant_id', (profile as any).tenant_id)
      .eq('appointment_id', appointmentId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'Error al obtener sesión' }, { status: 500 })
    return NextResponse.json({ data })
  }

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  const { data, error, count } = await (supabase as any)
    .from('grooming_sessions')
    .select(`
      id, session_date, notes, created_at, started_at, ended_at,
      pet:pet_id(id, name, species:species_id(name)),
      services:grooming_session_services(id, service_name)
    `, { count: 'exact' })
    .eq('tenant_id', (profile as any).tenant_id)
    .order('session_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: 'Error al obtener sesiones' }, { status: 500 })
  return NextResponse.json({ data, meta: { total: count ?? 0, page, limit } })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const result = groomingSessionSchema.safeParse(body)
  if (!result.success)
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { services, ...sessionData } = result.data
  const tenantId = (profile as any).tenant_id

  // Insert session
  const { data: session, error: sessionError } = await (supabase as any)
    .from('grooming_sessions')
    .insert({
      tenant_id: tenantId,
      pet_id: sessionData.pet_id,
      appointment_id: sessionData.appointment_id ?? null,
      session_date: sessionData.session_date,
      notes: sessionData.notes ?? null,
      started_at: sessionData.started_at ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (sessionError)
    return NextResponse.json({ error: 'Error al crear sesión' }, { status: 500 })

  // Insert services
  const serviceRows = services.map(s => ({
    session_id: session.id,
    tenant_id: tenantId,
    service_catalog_id: s.service_catalog_id ?? null,
    service_name: s.service_name,
  }))

  const { error: servicesError } = await (supabase as any)
    .from('grooming_session_services')
    .insert(serviceRows)

  if (servicesError) {
    // Clean up orphaned session to maintain immutability contract
    await (supabase as any).from('grooming_sessions').delete().eq('id', session.id)
    return NextResponse.json({ error: 'Error al guardar servicios' }, { status: 500 })
  }

  return NextResponse.json({ data: session }, { status: 201 })
}
