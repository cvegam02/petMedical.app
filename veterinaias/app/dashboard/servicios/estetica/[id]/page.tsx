import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EsteticaDetail } from '@/components/servicios/EsteticaDetail'

const GROOMING_SELECT = `
  id, status, scheduled_at, reason,
  pet:pet_id(id, name, species:species_id(name)),
  owner:owner_id(id, full_name, phone),
  assigned_to_profile:assigned_to(id, full_name),
  service_visit:service_visits(
    id, status, started_at, ended_at,
    grooming_record:grooming_records(
      visit_id, intake_notes, notes,
      services:grooming_record_services(id, service_name)
    )
  )
`

export default async function EsteticaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = (profile as any)?.tenant_id
  if (!tenantId) redirect('/login')

  // Try appointment ID first (from AppointmentPanel "Ver detalle" link)
  const { data: byAppt } = await (supabase
    .from('appointments')
    .select(GROOMING_SELECT)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single() as any)

  if (byAppt) return <EsteticaDetail appointment={byAppt} />

  const VISIT_SELECT = `
    id, status, started_at, ended_at, appointment_id,
    pet:pet_id(id, name, species:species_id(name)),
    owner:owner_id(id, full_name, phone),
    grooming_record:grooming_records(
      visit_id, intake_notes, notes,
      services:grooming_record_services(id, service_name)
    )
  `

  // Fallback: id is a service_visit ID (walk-in row)
  const { data: visitById } = await (supabase
    .from('service_visits')
    .select(VISIT_SELECT)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'grooming')
    .maybeSingle() as any)

  // Also try id as appointment_id (when appointment query failed due to service_type mismatch)
  const { data: visitByApptId } = visitById ? { data: null } : await (supabase
    .from('service_visits')
    .select(VISIT_SELECT)
    .eq('appointment_id', id)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'grooming')
    .maybeSingle() as any)

  const visit = visitById ?? visitByApptId

  if (!visit) notFound()

  const syntheticAppointment = {
    id: visit.appointment_id ?? visit.id,
    status: (visit.status === 'completed' ? 'completed' : 'confirmed') as 'confirmed' | 'completed',
    scheduled_at: visit.started_at ?? new Date().toISOString(),
    reason: null,
    pet: visit.pet,
    owner: visit.owner,
    assigned_to_profile: null,
    service_visit: [visit],
  }

  return <EsteticaDetail appointment={syntheticAppointment} visitId={visit.id} />
}
