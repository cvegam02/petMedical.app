import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { concludeSurgerySchema } from '@/lib/validations/surgery'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { data, error } = await (supabase as any)
    .from('service_visits')
    .select(`
      id, started_at, ended_at, status, created_at,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      record:surgery_records(*, attended_by_profile:attended_by(full_name)),
      prescriptions(id, medication_name, active_ingredient, dosage, route_of_administration, frequency, duration, notes)
    `)
    .eq('id', id)
    .eq('tenant_id', (profile as any).tenant_id)
    .eq('service_type', 'surgery')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Error al obtener cirugía' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Cirugía no encontrada' }, { status: 404 })

  const record = Array.isArray(data.record) ? data.record[0] : data.record
  return NextResponse.json({
    data: {
      id: data.id,
      started_at: data.started_at,
      ended_at: data.ended_at,
      status: data.status,
      pet: data.pet ?? null,
      owner: data.owner ?? null,
      prescriptions: data.prescriptions ?? [],
      ...(record ?? {}),
      attended_by_name: record?.attended_by_profile?.full_name ?? null,
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = concludeSurgerySchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  const d = result.data

  // Verify visit belongs to tenant
  const { data: visit } = await (supabase as any)
    .from('service_visits')
    .select('id, surgery_records(id)')
    .eq('id', id)
    .eq('tenant_id', (profile as any).tenant_id)
    .eq('service_type', 'surgery')
    .maybeSingle()
  if (!visit) return NextResponse.json({ error: 'Cirugía no encontrada' }, { status: 404 })

  const recordId = Array.isArray(visit.surgery_records)
    ? visit.surgery_records[0]?.id
    : visit.surgery_records?.id
  if (!recordId) return NextResponse.json({ error: 'Registro quirúrgico no encontrado' }, { status: 404 })

  // 1. Update surgery_records with conclusion data
  const { error: recError } = await (supabase as any)
    .from('surgery_records')
    .update({
      procedure: d.procedure,
      findings: d.findings ?? null,
      complications: d.complications ?? null,
      supplies: d.supplies ?? null,
      post_op_notes: d.post_op_notes ?? null,
      recovery_instructions: d.recovery_instructions ?? null,
      follow_up_date: d.follow_up_date ?? null,
    })
    .eq('id', recordId)
  if (recError) return NextResponse.json({ error: 'Error al actualizar el registro' }, { status: 500 })

  // 2. Update service_visit.started_at if surgery start time was provided
  if (d.started_at) {
    const { error: startError } = await (supabase as any)
      .from('service_visits')
      .update({ started_at: d.started_at })
      .eq('id', id)
    if (startError) return NextResponse.json({ error: 'Error al guardar hora de inicio' }, { status: 500 })
  }

  // 3. Insert prescriptions
  if (d.prescriptions && d.prescriptions.length > 0) {
    const { error: presError } = await (supabase as any)
      .from('prescriptions')
      .insert(d.prescriptions.map((p) => ({ ...p, visit_id: id })))
    if (presError) return NextResponse.json({ error: 'Error al guardar las recetas' }, { status: 500 })
  }

  // 4. Conclude service visit — sets ended_at, marks appointment as completed
  const endedAt = d.ended_at ?? new Date().toISOString()
  const { error: rpcError } = await (supabase as any).rpc('conclude_service_visit', {
    p_visit_id: id,
    p_ended_at: endedAt,
    p_notes: null,
    p_intake_notes: null,
  })
  if (rpcError) return NextResponse.json({ error: 'Error al concluir la cirugía' }, { status: 500 })

  return NextResponse.json({ data: { id } })
}
