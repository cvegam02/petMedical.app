import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EsteticaDetail } from '@/components/servicios/EsteticaDetail'

export default async function EsteticaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: appointment } = await (supabase
    .from('appointments')
    .select(`
      id, status, scheduled_at, reason,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name),
      service_visit:service_visits(
        id, status, started_at, ended_at,
        grooming_record:grooming_records(
          id, intake_notes, notes,
          services:grooming_record_services(id, service_name)
        )
      )
    `)
    .eq('id', id)
    .eq('service_type', 'grooming')
    .single() as any)

  if (!appointment) notFound()

  return <EsteticaDetail appointment={appointment} />
}
