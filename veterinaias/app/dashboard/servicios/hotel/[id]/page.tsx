import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoardingStayDetail } from '@/components/servicios/BoardingStayDetail'

export default async function HotelStayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // The id in the URL is the appointment ID (from AppointmentPanel "Ver detalle" link).
  // Fetch the appointment + linked service_visit (if any).
  const { data: appointment } = await supabase
    .from('appointments')
    .select(`
      id, status, scheduled_at,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      service_visit:service_visits(id, status, started_at, ended_at)
    `)
    .eq('id', id)
    .eq('service_type', 'boarding')
    .single() as any

  if (!appointment) {
    // The id might be a service_visit id (old link format) — fall back gracefully.
    return (
      <BoardingStayDetail
        visitId={id}
        appointmentId={null}
        appointmentStatus={null}
      />
    )
  }

  const visit = Array.isArray(appointment.service_visit)
    ? (appointment.service_visit[0] ?? null)
    : appointment.service_visit

  return (
    <BoardingStayDetail
      visitId={visit?.id ?? id}
      appointmentId={appointment.id}
      appointmentStatus={appointment.status}
      serviceVisitStartedAt={visit?.started_at ?? null}
    />
  )
}
