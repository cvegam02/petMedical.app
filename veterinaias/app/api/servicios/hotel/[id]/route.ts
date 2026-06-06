import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { boardingCheckOutSchema } from '@/lib/validations/boarding'

const STAY_SELECT = `
  id, started_at, ended_at, status, created_at, appointment_id,
  pet:pet_id(id, name, species:species_id(name)),
  record:boarding_records(expected_check_out, feeding_instructions, belongings, special_care, notes)
`

function mapStay(row: any) {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  return {
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status,
    created_at: row.created_at,
    appointment_id: row.appointment_id,
    pet: row.pet ?? null,
    expected_check_out: record?.expected_check_out ?? null,
    feeding_instructions: record?.feeding_instructions ?? null,
    belongings: record?.belongings ?? null,
    special_care: record?.special_care ?? null,
    notes: record?.notes ?? null,
  }
}

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
    .select(STAY_SELECT)
    .eq('id', id)
    .eq('tenant_id', (profile as any).tenant_id)
    .eq('service_type', 'boarding')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Error al obtener estancia' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Estancia no encontrada' }, { status: 404 })

  let owner = null
  if (data.pet?.id) {
    const { data: reg } = await (supabase as any)
      .from('pet_registrations')
      .select('owner:owner_id(id, full_name, phone, email)')
      .eq('pet_id', data.pet.id)
      .eq('tenant_id', (profile as any).tenant_id)
      .maybeSingle()
    owner = reg?.owner ?? null
  }

  return NextResponse.json({ data: { ...mapStay(data), owner } })
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

  const tenantId = (profile as any).tenant_id

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = boardingCheckOutSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data: existing, error: fetchError } = await (supabase as any)
    .from('service_visits').select('ended_at').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (fetchError) return NextResponse.json({ error: 'Error al verificar estancia' }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Estancia no encontrada' }, { status: 404 })
  if (existing.ended_at) return NextResponse.json({ error: 'La estancia ya fue concluida' }, { status: 409 })

  if (result.data.notes !== undefined) {
    const { error: notesError } = await (supabase as any)
      .from('boarding_records').update({ notes: result.data.notes }).eq('visit_id', id)
    if (notesError) return NextResponse.json({ error: 'Error al guardar notas' }, { status: 500 })
  }

  const { error: rpcError } = await (supabase as any).rpc('conclude_service_visit', {
    p_visit_id: id,
    p_ended_at: result.data.ended_at,
    p_notes: null,
    p_intake_notes: null,
  })
  if (rpcError) return NextResponse.json({ error: 'Error al hacer check-out' }, { status: 500 })

  const { data, error } = await (supabase as any)
    .from('service_visits').select(STAY_SELECT).eq('id', id).eq('tenant_id', tenantId).single()
  if (error) return NextResponse.json({ error: 'Error al obtener estancia actualizada' }, { status: 500 })

  return NextResponse.json({ data: mapStay(data) })
}
