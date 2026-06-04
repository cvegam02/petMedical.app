import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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
    .select(`
      id, service_type, status, started_at, ended_at, created_at, appointment_id,
      pet:pet_id(id, name, species:species_id(name)),
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name)),
      boarding:boarding_records(expected_check_out),
      hospitalization:hospitalization_records(reason, diagnosis)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: true })

  if (error)
    return NextResponse.json({ error: 'Error al obtener servicios activos' }, { status: 500 })

  const mapped = (data ?? []).map((row: any) => {
    const record = Array.isArray(row.record) ? row.record[0] : row.record
    return {
      id: row.id,
      service_type: row.service_type,
      status: row.status,
      started_at: row.started_at,
      ended_at: row.ended_at,
      created_at: row.created_at,
      appointment_id: row.appointment_id,
      session_date: row.started_at ?? row.created_at,
      notes: record?.notes ?? null,
      intake_notes: record?.intake_notes ?? null,
      services: record?.services ?? [],
      pet: row.pet ?? null,
      expected_check_out: (Array.isArray(row.boarding) ? row.boarding[0] : row.boarding)?.expected_check_out ?? null,
      hosp_reason: (Array.isArray(row.hospitalization) ? row.hospitalization[0] : row.hospitalization)?.reason ?? null,
    }
  })

  return NextResponse.json({ data: mapped })
}
