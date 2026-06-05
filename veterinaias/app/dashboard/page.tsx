import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import { AgendaScreen } from '@/components/agenda/AgendaScreen'
import type { AgendaAppointment } from '@/components/agenda/DayView'
import type { ActiveServiceItem } from '@/components/dashboard/ActiveServicesBand'

// Request-time rendering: metrics derive from the current time.
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, tenant_id, tenants(name, type, subscription_status, settings)')
    .eq('id', user!.id)
    .single() as any

  const tenant = profile?.tenants
  const businessHours = (tenant as any)?.settings?.business_hours ?? DEFAULT_BUSINESS_HOURS

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('full_name') as { data: { id: string; full_name: string }[] | null }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + 86400000)

  const showAll =
    tenant?.type === 'individual' ||
    profile?.role === 'admin' ||
    profile?.role === 'assistant' ||
    profile?.role === 'staff'

  let appointmentsQuery = supabase
    .from('appointments')
    .select(`
      id, status, scheduled_at, duration_minutes, reason, service_type,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .eq('tenant_id', profile.tenant_id)
    .gte('scheduled_at', todayStart.toISOString())
    .order('scheduled_at', { ascending: true })

  if (!showAll && profile?.role === 'doctor') {
    appointmentsQuery = appointmentsQuery.eq('assigned_to', user!.id)
  }

  const { data: appointments } = await appointmentsQuery as { data: any[] | null }

  const todayAppointments = appointments?.filter(a =>
    new Date(a.scheduled_at) < tomorrowStart
  ) ?? []

  // Active services (in_progress service_visits, any type)
  const { data: activeRaw } = await (supabase as any)
    .from('service_visits')
    .select(`
      id, service_type, status, started_at, ended_at, created_at, appointment_id,
      pet:pet_id(id, name, species:species_id(name)),
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name)),
      boarding:boarding_records(expected_check_out)
    `)
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: true })

  const initialActiveServices: ActiveServiceItem[] = (activeRaw ?? []).map((row: any) => {
    const record = Array.isArray(row.record) ? row.record[0] : row.record
    return {
      id: row.id,
      service_type: row.service_type,
      status: row.status,
      started_at: row.started_at,
      ended_at: row.ended_at,
      session_date: row.started_at ?? row.created_at,
      notes: record?.notes ?? null,
      intake_notes: record?.intake_notes ?? null,
      services: record?.services ?? [],
      pet: row.pet ?? null,
      appointment_id: row.appointment_id,
      expected_check_out: (Array.isArray(row.boarding) ? row.boarding[0] : row.boarding)?.expected_check_out ?? null,
    }
  })

  return (
    <AgendaScreen
      date={todayStart}
      appointments={(appointments ?? []) as AgendaAppointment[]}
      metrics={{
        total: todayAppointments.length,
        inService: initialActiveServices.filter((s: any) => s.service_type !== 'boarding').length,
        hotelActive: initialActiveServices.filter((s: any) => s.service_type === 'boarding').length,
        pendingConfirm: todayAppointments.filter((a: any) => a.status === 'scheduled').length,
      }}
      team={team ?? []}
      businessHours={businessHours}
    />
  )
}
