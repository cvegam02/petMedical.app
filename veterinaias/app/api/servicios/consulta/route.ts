import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VISIT_SELECT = `
  id, created_at,
  pet:pet_id(id, name, species:species_id(name)),
  owner:owner_id(id, full_name),
  record:consultation_records(attended_by, reason, diagnosis, vet_profile:attended_by(id, full_name))
`

const APPT_SELECT = `
  id, status, scheduled_at, duration_minutes, reason, service_type,
  pet:pet_id(id, name, species:species_id(name)),
  owner:owner_id(id, full_name, phone),
  assigned_to_profile:assigned_to(id, full_name)
`

function mapVisitRow(row: any) {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  const vetProfile = Array.isArray(record?.vet_profile) ? record?.vet_profile[0] : record?.vet_profile
  return {
    id: row.id,
    created_at: row.created_at,
    pet: row.pet ?? null,
    owner: row.owner ?? null,
    reason: record?.reason ?? null,
    diagnosis: record?.diagnosis ?? null,
    attended_by: record?.attended_by ?? null,
    attended_by_name: vetProfile?.full_name ?? null,
  }
}

function mapApptRow(row: any) {
  const assignedTo = Array.isArray(row.assigned_to_profile)
    ? row.assigned_to_profile[0]
    : row.assigned_to_profile
  return {
    id: row.id,
    status: row.status,
    scheduled_at: row.scheduled_at,
    duration_minutes: row.duration_minutes ?? null,
    reason: row.reason ?? null,
    pet: row.pet ?? null,
    owner: row.owner ?? null,
    assigned_to: assignedTo ?? null,
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenantId = (profile as any).tenant_id
  const url = new URL(req.url)
  const tab = url.searchParams.get('tab') ?? 'historial'

  // — Citas de hoy (appointments table) —
  if (tab === 'hoy') {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    const { data, error } = await (supabase as any)
      .from('appointments')
      .select(APPT_SELECT)
      .eq('tenant_id', tenantId)
      .eq('service_type', 'consultation')
      .gte('scheduled_at', todayStart)
      .lt('scheduled_at', tomorrowStart)
      .not('status', 'in', '("cancelled","no_show")')
      .order('scheduled_at', { ascending: true })
    if (error) return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500 })
    return NextResponse.json({ data: (data ?? []).map(mapApptRow) })
  }

  // — Próximas citas (appointments table) —
  if (tab === 'proximas') {
    const now = new Date()
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    const { data, error } = await (supabase as any)
      .from('appointments')
      .select(APPT_SELECT)
      .eq('tenant_id', tenantId)
      .eq('service_type', 'consultation')
      .gte('scheduled_at', tomorrowStart)
      .not('status', 'in', '("cancelled","no_show")')
      .order('scheduled_at', { ascending: true })
      .limit(50)
    if (error) return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500 })
    return NextResponse.json({ data: (data ?? []).map(mapApptRow) })
  }

  // — Historial (service_visits — default) —
  const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const vetParam = url.searchParams.get('vet')
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')

  if (fromParam && !DATE_REGEX.test(fromParam))
    return NextResponse.json({ error: 'Parámetro from inválido (formato: YYYY-MM-DD)' }, { status: 400 })
  if (toParam && !DATE_REGEX.test(toParam))
    return NextResponse.json({ error: 'Parámetro to inválido (formato: YYYY-MM-DD)' }, { status: 400 })
  if (vetParam && !UUID_REGEX.test(vetParam))
    return NextResponse.json({ error: 'Parámetro vet inválido' }, { status: 400 })

  let query = (supabase as any)
    .from('service_visits')
    .select(VISIT_SELECT)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'consultation')
    .order('created_at', { ascending: false })
    .limit(100)

  if (fromParam) query = query.gte('created_at', `${fromParam}T00:00:00.000Z`)
  if (toParam) query = query.lte('created_at', `${toParam}T23:59:59.999Z`)
  if (vetParam) query = query.eq('consultation_records.attended_by', vetParam)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Error al obtener consultas' }, { status: 500 })

  return NextResponse.json({ data: (data ?? []).map(mapVisitRow) })
}
