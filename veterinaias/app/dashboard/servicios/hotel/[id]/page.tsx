import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HotelAppointmentDetail } from '@/components/servicios/HotelAppointmentDetail'

export default async function HotelAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = (profile as any)?.tenant_id
  if (!tenantId) redirect('/login')

  const { data: appointment } = await (supabase as any)
    .from('appointments')
    .select(`
      id, status, scheduled_at, expected_check_out,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone, email),
      assigned_to_profile:assigned_to(id, full_name),
      service_visit:service_visits(id, status, started_at, ended_at)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'boarding')
    .single()

  if (!appointment) notFound()

  const visit = Array.isArray(appointment.service_visit)
    ? (appointment.service_visit[0] ?? null)
    : appointment.service_visit

  if (visit?.id) redirect(`/dashboard/servicios/hotel/stay/${visit.id}`)

  return (
    <HotelAppointmentDetail
      appointmentId={appointment.id}
      appointmentStatus={appointment.status}
      appointmentExpectedCheckOut={appointment.expected_check_out ?? null}
      pet={appointment.pet}
      owner={appointment.owner}
      assignedTo={appointment.assigned_to_profile}
      scheduledAt={appointment.scheduled_at}
    />
  )
}
