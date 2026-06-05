import { createClient } from '@/lib/supabase/server'
import { SurgeryDetail } from '@/components/servicios/SurgeryDetail'

export default async function SurgeryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Try to find by appointment_id first (new link format from AppointmentPanel)
  const { data: appointment } = await supabase
    .from('appointments')
    .select(`
      id, status,
      service_visit:service_visits(id, started_at)
    `)
    .eq('id', id)
    .eq('service_type', 'surgery')
    .single() as any

  if (appointment) {
    const visit = Array.isArray(appointment.service_visit)
      ? (appointment.service_visit[0] ?? null)
      : appointment.service_visit
    return (
      <SurgeryDetail
        visitId={visit?.id ?? id}
        appointmentId={appointment.id}
        appointmentStatus={appointment.status}
        surgeryStartedAt={visit?.started_at ?? null}
      />
    )
  }

  // Fall back to service_visit ID (old link format)
  return <SurgeryDetail visitId={id} appointmentId={null} appointmentStatus={null} surgeryStartedAt={null} />
}
