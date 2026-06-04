import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { admitPatientSchema } from '@/lib/validations/hospitalization'

const VISIT_SELECT = `
  id, started_at, ended_at, status, created_at,
  pet:pet_id(id, name, species:species_id(name)),
  owner:owner_id(id, full_name, phone),
  record:hospitalization_records(
    source_visit_id, reason, diagnosis, weight_kg, treatment_plan,
    discharge_notes, discharge_diagnosis, post_discharge_instructions
  )
`

function mapRow(row: any) {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  return {
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status,
    created_at: row.created_at,
    pet: row.pet ?? null,
    owner: row.owner ?? null,
    source_visit_id: record?.source_visit_id ?? null,
    reason: record?.reason ?? null,
    diagnosis: record?.diagnosis ?? null,
    weight_kg: record?.weight_kg ?? null,
    treatment_plan: record?.treatment_plan ?? null,
    discharge_notes: record?.discharge_notes ?? null,
    discharge_diagnosis: record?.discharge_diagnosis ?? null,
    post_discharge_instructions: record?.post_discharge_instructions ?? null,
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

  const { data, error } = await (supabase as any)
    .from('service_visits')
    .select(VISIT_SELECT)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'hospitalization')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Error al obtener hospitalizaciones' }, { status: 500 })

  return NextResponse.json({ data: (data ?? []).map(mapRow) })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenantId = (profile as any).tenant_id

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = admitPatientSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  const data = result.data

  // Resolve pet_id and owner_id from source visit
  const { data: sourceVisit } = await (supabase as any)
    .from('service_visits')
    .select('pet_id, owner_id')
    .eq('id', data.source_visit_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!sourceVisit) return NextResponse.json({ error: 'Visita de origen no encontrada' }, { status: 404 })

  const { data: visit, error: visitError } = await (supabase as any)
    .from('service_visits')
    .insert({
      tenant_id: tenantId,
      pet_id: sourceVisit.pet_id,
      owner_id: sourceVisit.owner_id,
      service_type: 'hospitalization',
      status: 'in_progress',
      started_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select()
    .single()
  if (visitError) return NextResponse.json({ error: 'Error al crear hospitalización' }, { status: 500 })

  const { error: recordError } = await (supabase as any)
    .from('hospitalization_records')
    .insert({
      visit_id: visit.id,
      source_visit_id: data.source_visit_id,
      admitted_by: data.admitted_by ?? user.id,
      reason: data.reason,
      diagnosis: data.diagnosis ?? null,
      weight_kg: data.weight_kg ?? null,
      treatment_plan: data.treatment_plan ?? null,
    })
  if (recordError) {
    await (supabase as any).from('service_visits').delete().eq('id', visit.id)
    return NextResponse.json({ error: 'Error al guardar datos de ingreso' }, { status: 500 })
  }

  return NextResponse.json({ data: { id: visit.id } }, { status: 201 })
}
