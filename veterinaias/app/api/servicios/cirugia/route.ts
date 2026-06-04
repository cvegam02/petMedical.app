import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scheduleSurgerySchema } from '@/lib/validations/surgery'

const LIST_SELECT = `
  id, started_at, ended_at, status, created_at, appointment_id,
  pet:pet_id(id, name, species:species_id(name)),
  record:surgery_records(procedure, diagnosis)
`

function mapRow(row: any) {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  return {
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status,
    created_at: row.created_at,
    appointment_id: row.appointment_id,
    pet: row.pet ?? null,
    procedure: record?.procedure ?? null,
    diagnosis: record?.diagnosis ?? null,
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
  const appointmentId = new URL(req.url).searchParams.get('appointmentId')

  if (appointmentId) {
    const { data, error } = await (supabase as any)
      .from('service_visits').select(LIST_SELECT)
      .eq('tenant_id', tenantId).eq('service_type', 'surgery').eq('appointment_id', appointmentId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'Error al obtener cirugía' }, { status: 500 })
    return NextResponse.json({ data: data ? mapRow(data) : null })
  }

  const { data, error } = await (supabase as any)
    .from('service_visits').select(LIST_SELECT)
    .eq('tenant_id', tenantId).eq('service_type', 'surgery')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Error al obtener cirugías' }, { status: 500 })

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

  const result = scheduleSurgerySchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  const d = result.data

  // 1. Create appointment
  const { data: appt, error: apptError } = await (supabase as any)
    .from('appointments')
    .insert({
      tenant_id: tenantId,
      pet_id: d.pet_id,
      owner_id: d.owner_id,
      scheduled_at: d.scheduled_at,
      service_type: 'surgery',
      assigned_to: d.attended_by,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (apptError) return NextResponse.json({ error: 'Error al crear la cita' }, { status: 500 })
  const appointmentId: string = appt.id

  // 2. Create service_visit (started_at=null — surgery hasn't happened yet)
  const { data: visit, error: visitError } = await (supabase as any)
    .from('service_visits')
    .insert({
      tenant_id: tenantId,
      pet_id: d.pet_id,
      owner_id: d.owner_id,
      appointment_id: appointmentId,
      service_type: 'surgery',
      status: 'in_progress',
      started_at: null,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (visitError) {
    await (supabase as any).from('appointments').delete().eq('id', appointmentId)
    return NextResponse.json({ error: 'Error al crear el registro de cirugía' }, { status: 500 })
  }
  const visitId: string = visit.id

  // 3. Create surgery_records with pre-op data only
  const { error: recError } = await (supabase as any)
    .from('surgery_records')
    .insert({
      visit_id: visitId,
      attended_by: d.attended_by,
      diagnosis: d.diagnosis ?? null,
      weight_kg: d.weight_kg ?? null,
      pre_op_notes: d.pre_op_notes ?? null,
      anesthesia_type: d.anesthesia_type ?? null,
      anesthesia_notes: d.anesthesia_notes ?? null,
    })
  if (recError) {
    await (supabase as any).from('service_visits').delete().eq('id', visitId)
    await (supabase as any).from('appointments').delete().eq('id', appointmentId)
    return NextResponse.json({ error: 'Error al guardar datos pre-operatorios' }, { status: 500 })
  }

  return NextResponse.json({ data: { id: visitId, appointment_id: appointmentId } }, { status: 201 })
}
