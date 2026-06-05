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
  const vet = url.searchParams.get('vet')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  let query = (supabase as any)
    .from('service_visits')
    .select(VISIT_SELECT)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'consultation')
    .order('created_at', { ascending: false })
    .limit(100)

  if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`)
  if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Error al obtener consultas' }, { status: 500 })

  let rows = (data ?? []).map(mapVisitRow)
  if (vet) rows = rows.filter((r: any) => r.attended_by === vet)

  return NextResponse.json({ data: rows })
}
