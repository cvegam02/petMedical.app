import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Reservas de hotel próximas (próximos 7 días) que aún NO han hecho check-in.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenantId = (profile as any).tenant_id
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const in7Days = new Date(todayStart.getTime() + 7 * 86400000)

  const { data: appts, error } = await (supabase as any)
    .from('appointments')
    .select(`
      id, status, scheduled_at, duration_minutes, reason, service_type, expected_check_out,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'boarding')
    .in('status', ['scheduled', 'confirmed'])
    .gte('scheduled_at', todayStart.toISOString())
    .lt('scheduled_at', in7Days.toISOString())
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Error al obtener reservas' }, { status: 500 })

  const apptList = appts ?? []
  if (apptList.length === 0) return NextResponse.json({ data: [] })

  // Exclude appointments that already have a service_visit (check-in done).
  // Filter by the bounded apptIds set — avoids a full-table scan across all boarding visits.
  const apptIds = apptList.map((a: any) => a.id)
  const { data: visits } = await (supabase as any)
    .from('service_visits')
    .select('appointment_id')
    .in('appointment_id', apptIds)
    .eq('service_type', 'boarding')

  const checkedIn = new Set((visits ?? []).map((v: any) => v.appointment_id))
  const data = apptList.filter((a: any) => !checkedIn.has(a.id))

  return NextResponse.json({ data })
}
