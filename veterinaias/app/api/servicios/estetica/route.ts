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

  const tenantId = (profile as any).tenant_id
  const { searchParams } = new URL(req.url)
  const appointmentId = searchParams.get('appointmentId')

  // Single-session lookup by appointment_id (used by the appointment dialog)
  if (appointmentId) {
    const { data, error } = await (supabase as any)
      .from('service_visits')
      .select(`
        id, started_at, ended_at, status, created_at, appointment_id,
        pet:pet_id(id, name, species:species_id(name)),
        owner:owner_id(id, full_name),
        record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name)),
        appointment:appointment_id(assigned_to:assigned_to(id, full_name))
      `)
      .eq('tenant_id', tenantId)
      .eq('service_type', 'grooming')
      .eq('appointment_id', appointmentId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'Error al obtener sesión' }, { status: 500 })

    if (!data) return NextResponse.json({ data: null })

    const record = Array.isArray(data.record) ? data.record[0] : data.record
    const appt = Array.isArray(data.appointment) ? data.appointment[0] : data.appointment
    return NextResponse.json({
      data: {
        ...data,
        session_date: data.started_at ?? data.created_at,
        notes: record?.notes ?? null,
        intake_notes: record?.intake_notes ?? null,
        services: record?.services ?? [],
        owner: data.owner ?? null,
      },
    })
  }

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  const { data, error, count } = await (supabase as any)
    .from('service_visits')
    .select(`
      id, started_at, ended_at, status, created_at, appointment_id,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name),
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name))
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('service_type', 'grooming')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: 'Error al obtener sesiones' }, { status: 500 })

  const mapped = (data ?? []).map((row: any) => {
    const record = Array.isArray(row.record) ? row.record[0] : row.record
    return {
      ...row,
      session_date: row.started_at ?? row.created_at,
      notes: record?.notes ?? null,
      intake_notes: record?.intake_notes ?? null,
      services: record?.services ?? [],
      owner: row.owner ?? null,
    }
  })

  return NextResponse.json({ data: mapped, meta: { total: count ?? 0, page, limit } })
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

  // Step 1: resolve owner_id
  // Try appointment first, then pet_registrations
  let ownerId: string | null = null
  if (sessionData.appointment_id) {
    const { data: appt } = await (supabase as any)
      .from('appointments')
      .select('owner_id')
      .eq('id', sessionData.appointment_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    ownerId = appt?.owner_id ?? null
  }
  if (!ownerId) {
    const { data: reg } = await (supabase as any)
      .from('pet_registrations')
      .select('owner_id')
      .eq('pet_id', sessionData.pet_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    ownerId = reg?.owner_id ?? null
  }

  if (!ownerId) {
    return NextResponse.json({ error: 'No se pudo determinar el dueño de la mascota' }, { status: 422 })
  }

  // Step 2: insert service_visit
  const { data: visit, error: visitError } = await (supabase as any)
    .from('service_visits')
    .insert({
      tenant_id: tenantId,
      pet_id: sessionData.pet_id,
      owner_id: ownerId,
      appointment_id: sessionData.appointment_id ?? null,
      service_type: 'grooming',
      status: sessionData.started_at ? 'in_progress' : 'completed',
      started_at: sessionData.started_at ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (visitError)
    return NextResponse.json({ error: 'Error al crear sesión' }, { status: 500 })

  // Step 3: insert grooming_record
  const { error: recordError } = await (supabase as any)
    .from('grooming_records')
    .insert({
      visit_id: visit.id,
      notes: sessionData.notes ?? null,
      intake_notes: sessionData.intake_notes ?? null,
    })

  if (recordError) {
    await (supabase as any).from('service_visits').delete().eq('id', visit.id)
    return NextResponse.json({ error: 'Error al guardar registro' }, { status: 500 })
  }

  // Step 4: resolve services to record.
  // When started from an appointment without explicit services, inherit the
  // services that were selected when the appointment was booked.
  let effectiveServices: { service_name: string; service_catalog_id?: string | null }[] = services
  if (effectiveServices.length === 0 && sessionData.appointment_id) {
    const { data: apptServices } = await (supabase as any)
      .from('appointment_grooming_services')
      .select('service_name, service_catalog_id')
      .eq('appointment_id', sessionData.appointment_id)
    effectiveServices = apptServices ?? []
  }

  let insertedServices: { id: string; service_name: string }[] = []
  if (effectiveServices.length > 0) {
    const serviceRows = effectiveServices.map((s) => ({
      record_id: visit.id,
      service_catalog_id: s.service_catalog_id ?? null,
      service_name: s.service_name,
    }))

    const { data: created, error: servicesError } = await (supabase as any)
      .from('grooming_record_services')
      .insert(serviceRows)
      .select('id, service_name')

    if (servicesError) {
      await (supabase as any).from('service_visits').delete().eq('id', visit.id)
      return NextResponse.json({ error: 'Error al guardar servicios' }, { status: 500 })
    }
    insertedServices = created ?? []
  }

  return NextResponse.json({
    data: { ...visit, services: insertedServices },
  }, { status: 201 })
}
