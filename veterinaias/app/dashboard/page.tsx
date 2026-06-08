import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import { isCheckoutOverdue } from '@/lib/utils/boarding'
import { OperationsDashboard } from '@/components/dashboard/OperationsDashboard'
import type { ActiveServiceItem } from '@/components/dashboard/ActiveServicesBand'
import type { Alert } from '@/components/dashboard/AlertBanner'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

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
    .lt('scheduled_at', tomorrowStart.toISOString())
    .order('scheduled_at', { ascending: true })

  if (!showAll && profile?.role === 'doctor') {
    appointmentsQuery = appointmentsQuery.eq('assigned_to', user!.id)
  }

  const { data: appointments } = await appointmentsQuery as { data: DashboardAppointment[] | null }

  // Active service visits
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
    const boarding = Array.isArray(row.boarding) ? row.boarding[0] : row.boarding
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
      expected_check_out: boarding?.expected_check_out ?? null,
    }
  })

  // Calculate alerts
  const nowMs = now.getTime()

  const checkoutOverdueAlerts: Alert[] = initialActiveServices
    .filter(s =>
      s.service_type === 'boarding' &&
      isCheckoutOverdue(s.expected_check_out, s.started_at, s.ended_at ?? null, nowMs)
    )
    .map(s => {
      const overdueMs = nowMs - new Date(s.expected_check_out!).getTime()
      return {
        type: 'checkout_overdue' as const,
        visitId: s.id,
        petName: s.pet?.name ?? '—',
        overdueMinutes: Math.round(overdueMs / 60000),
      }
    })

  const urgentUnconfirmedAlerts: Alert[] = (appointments ?? [])
    .filter(a => {
      const apptMs = new Date(a.scheduled_at).getTime()
      return a.status === 'scheduled' && apptMs > nowMs && apptMs - nowMs <= 60 * 60 * 1000
    })
    .map(a => {
      const minutesUntil = Math.round((new Date(a.scheduled_at).getTime() - nowMs) / 60000)
      return {
        type: 'urgent_unconfirmed' as const,
        appointmentId: a.id,
        petName: a.pet?.name ?? '—',
        serviceType: a.service_type ?? 'consultation',
        minutesUntil,
      }
    })

  const alerts: Alert[] = [...checkoutOverdueAlerts, ...urgentUnconfirmedAlerts]

  // Derive metrics
  const inService = initialActiveServices.filter(s => s.service_type !== 'boarding').length
  const hotelActive = initialActiveServices.filter(s => s.service_type === 'boarding').length
  const total = (appointments ?? []).length
  const pendingConfirm = (appointments ?? []).filter(a => a.status === 'scheduled').length

  return (
    <OperationsDashboard
      date={todayStart}
      appointments={(appointments ?? []) as DashboardAppointment[]}
      metrics={{ inService, hotelActive, total, pendingConfirm, alerts: alerts.length }}
      alerts={alerts}
      initialActiveServices={initialActiveServices}
      team={team ?? []}
      businessHours={businessHours}
    />
  )
}
