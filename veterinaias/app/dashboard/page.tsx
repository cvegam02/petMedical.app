import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import { DashboardTwoColumn } from '@/components/dashboard/DashboardTwoColumn'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

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
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

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
      id, status, scheduled_at, duration_minutes, reason,
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

  const todayAppointments = (appointments?.filter(a =>
    new Date(a.scheduled_at) < tomorrowStart
  ) ?? []) as DashboardAppointment[]

  const futureAppointments = (appointments?.filter(a =>
    new Date(a.scheduled_at) >= tomorrowStart
  ).slice(0, 5) ?? []) as DashboardAppointment[]

  const nextAppointment: DashboardAppointment | null =
    todayAppointments.find(a => ['scheduled', 'confirmed'].includes(a.status)) ?? null

  const metrics = {
    total: todayAppointments.length,
    completed: todayAppointments.filter(a => a.status === 'completed').length,
    pendingConfirm: todayAppointments.filter(a => a.status === 'scheduled').length,
  }

  return (
    <DashboardTwoColumn
      greeting={greeting}
      firstName={firstName}
      today={today}
      nextAppointment={nextAppointment}
      todayAppointments={todayAppointments}
      futureAppointments={futureAppointments}
      metrics={metrics}
      team={team ?? []}
      businessHours={businessHours}
      role={profile?.role ?? ''}
    />
  )
}
