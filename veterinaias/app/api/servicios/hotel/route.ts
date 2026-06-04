import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { boardingCheckInSchema } from '@/lib/validations/boarding'

const STAY_SELECT = `
  id, started_at, ended_at, status, created_at, appointment_id,
  pet:pet_id(id, name, species:species_id(name)),
  owner:owner_id(id, full_name, phone),
  record:boarding_records(expected_check_out, feeding_instructions, belongings, special_care, notes),
  daily_logs:boarding_daily_logs(log_date, notes, fed, walked)
`

function mapStay(row: any) {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  const today = new Date().toISOString().split('T')[0]
  const logs: any[] = Array.isArray(row.daily_logs) ? row.daily_logs : []
  const todayLog = logs.find((l: any) => l.log_date === today) ?? null
  return {
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status,
    created_at: row.created_at,
    appointment_id: row.appointment_id,
    pet: row.pet ?? null,
    owner: row.owner ?? null,
    expected_check_out: record?.expected_check_out ?? null,
    feeding_instructions: record?.feeding_instructions ?? null,
    belongings: record?.belongings ?? null,
    special_care: record?.special_care ?? null,
    notes: record?.notes ?? null,
    today_note: todayLog?.notes ?? null,
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
      .from('service_visits')
      .select(STAY_SELECT)
      .eq('tenant_id', tenantId)
      .eq('service_type', 'boarding')
      .eq('appointment_id', appointmentId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'Error al obtener estancia' }, { status: 500 })
    return NextResponse.json({ data: data ? mapStay(data) : null })
  }

  const { data, error } = await (supabase as any)
    .from('service_visits')
    .select(STAY_SELECT)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'boarding')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Error al obtener estancias' }, { status: 500 })

  return NextResponse.json({ data: (data ?? []).map(mapStay) })
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

  const result = boardingCheckInSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  const data = result.data

  let ownerId: string | null = null
  const { data: appt } = await (supabase as any)
    .from('appointments').select('owner_id, expected_check_out').eq('id', data.appointment_id).eq('tenant_id', tenantId).maybeSingle()
  ownerId = appt?.owner_id ?? null
  if (!ownerId) {
    const { data: reg } = await (supabase as any)
      .from('pet_registrations').select('owner_id').eq('pet_id', data.pet_id).eq('tenant_id', tenantId).maybeSingle()
    ownerId = reg?.owner_id ?? null
  }
  if (!ownerId) return NextResponse.json({ error: 'No se pudo determinar el dueño de la mascota' }, { status: 422 })

  const { data: visit, error: visitError } = await (supabase as any)
    .from('service_visits')
    .insert({
      tenant_id: tenantId,
      pet_id: data.pet_id,
      owner_id: ownerId,
      appointment_id: data.appointment_id,
      service_type: 'boarding',
      status: 'in_progress',
      started_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select()
    .single()
  if (visitError) return NextResponse.json({ error: 'Error al crear la estancia' }, { status: 500 })

  const { error: recordError } = await (supabase as any)
    .from('boarding_records')
    .insert({
      visit_id: visit.id,
      expected_check_out: data.expected_check_out ?? appt?.expected_check_out ?? null,
      feeding_instructions: data.feeding_instructions ?? null,
      belongings: data.belongings ?? null,
      special_care: data.special_care ?? null,
    })
  if (recordError) {
    const { error: rollbackError } = await (supabase as any).from('service_visits').delete().eq('id', visit.id)
    if (rollbackError) console.error('hotel check-in rollback failed for visit', visit.id, rollbackError)
    return NextResponse.json({ error: 'Error al guardar la recepción' }, { status: 500 })
  }

  return NextResponse.json({ data: { ...visit } }, { status: 201 })
}
