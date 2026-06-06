import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dischargeSchema } from '@/lib/validations/hospitalization'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VISIT_SELECT = `
  id, started_at, ended_at, status, created_at,
  pet:pet_id(id, name, species:species_id(name)),
  owner:owner_id(id, full_name, phone),
  record:hospitalization_records(
    source_visit_id, admitted_by, reason, diagnosis, weight_kg, treatment_plan,
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
    admitted_by: record?.admitted_by ?? null,
    reason: record?.reason ?? null,
    diagnosis: record?.diagnosis ?? null,
    weight_kg: record?.weight_kg ?? null,
    treatment_plan: record?.treatment_plan ?? null,
    discharge_notes: record?.discharge_notes ?? null,
    discharge_diagnosis: record?.discharge_diagnosis ?? null,
    post_discharge_instructions: record?.post_discharge_instructions ?? null,
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { data, error } = await (supabase as any)
    .from('service_visits')
    .select(VISIT_SELECT)
    .eq('id', id)
    .eq('tenant_id', (profile as any).tenant_id)
    .eq('service_type', 'hospitalization')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Error al obtener hospitalización' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Hospitalización no encontrada' }, { status: 404 })

  return NextResponse.json({ data: mapRow(data) })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
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

  const result = dischargeSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  const data = result.data

  const { data: existing } = await (supabase as any)
    .from('service_visits').select('ended_at').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Hospitalización no encontrada' }, { status: 404 })
  if (existing.ended_at) return NextResponse.json({ error: 'La hospitalización ya fue concluida' }, { status: 409 })

  const updateFields: Record<string, unknown> = {}
  if (data.discharge_notes !== undefined) updateFields.discharge_notes = data.discharge_notes
  if (data.discharge_diagnosis !== undefined) updateFields.discharge_diagnosis = data.discharge_diagnosis
  if (data.post_discharge_instructions !== undefined) updateFields.post_discharge_instructions = data.post_discharge_instructions

  if (Object.keys(updateFields).length > 0) {
    const { error: updateError } = await (supabase as any)
      .from('hospitalization_records').update(updateFields).eq('visit_id', id)
    if (updateError) return NextResponse.json({ error: 'Error al guardar datos de alta' }, { status: 500 })
  }

  if (data.prescriptions && data.prescriptions.length > 0) {
    const { data: visitForPet } = await (supabase as any)
      .from('service_visits').select('pet_id, owner_id').eq('id', id).single()
    const rxRows = data.prescriptions.map((rx: any) => ({
      tenant_id: tenantId,
      service_visit_id: id,
      pet_id: visitForPet?.pet_id,
      owner_id: visitForPet?.owner_id,
      medication_name: rx.medication_name,
      dosage: rx.dosage,
      frequency: rx.frequency,
      duration: rx.duration,
      route_of_administration: rx.route_of_administration ?? null,
      notes: rx.notes ?? null,
      prescribed_by: user.id,
    }))
    const { error: rxError } = await (supabase as any).from('prescriptions').insert(rxRows)
    if (rxError) return NextResponse.json({ error: 'Error al guardar prescripciones' }, { status: 500 })
  }

  const { error: rpcError } = await (supabase as any).rpc('conclude_service_visit', {
    p_visit_id: id,
    p_ended_at: data.ended_at,
    p_notes: null,
    p_intake_notes: null,
  })
  if (rpcError) return NextResponse.json({ error: 'Error al dar de alta' }, { status: 500 })

  return NextResponse.json({ data: { id } })
}
