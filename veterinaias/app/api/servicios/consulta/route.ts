import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VISIT_SELECT = `
  id, created_at,
  pet:pet_id(id, name, species:species_id(name)),
  owner:owner_id(id, full_name),
  record:consultation_records(attended_by, reason, diagnosis, vet_profile:attended_by(id, full_name))
`

interface ConsultationRow {
  id: string
  created_at: string
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string } | null
  reason: string | null
  diagnosis: string | null
  attended_by: string | null
  attended_by_name: string | null
}

function mapRow(row: any): ConsultationRow {
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

  let rows: ConsultationRow[] = (data ?? []).map(mapRow)

  // Filter by vet post-fetch (PostgREST can't filter on embedded table columns directly)
  if (vet) rows = rows.filter(r => r.attended_by === vet)

  return NextResponse.json({ data: rows })
}
