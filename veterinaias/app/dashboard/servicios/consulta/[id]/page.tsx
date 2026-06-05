import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConsultaDetail } from '@/components/servicios/ConsultaDetail'

export default async function ConsultaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: appointment } = await (supabase
    .from('appointments')
    .select(`
      id, status, scheduled_at, duration_minutes, reason, service_type,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone, email),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .eq('id', id)
    .eq('service_type', 'consultation')
    .single() as any)

  if (!appointment) notFound()

  return <ConsultaDetail appointment={appointment} />
}
