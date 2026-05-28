import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import Link from 'next/link'
import { Users, PawPrint, Calendar, Settings2, ChevronRight, Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'
import { NextAppointmentCard } from '@/components/dashboard/NextAppointmentCard'
import { AppointmentQuickModal } from '@/components/dashboard/AppointmentQuickModal'
import { NewAppointmentButton } from '@/components/appointments/NewAppointmentButton'
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

  const todayAppointments = appointments?.filter(a =>
    new Date(a.scheduled_at) < tomorrowStart
  ) ?? []

  const futureAppointments = appointments?.filter(a =>
    new Date(a.scheduled_at) >= tomorrowStart
  ).slice(0, 5) ?? []

  const PENDING_STATUSES = ['scheduled', 'confirmed']
  const nextAppointment: DashboardAppointment | null =
    (todayAppointments as DashboardAppointment[]).find(a => PENDING_STATUSES.includes(a.status)) ?? null
  const otherAppointments: DashboardAppointment[] = nextAppointment
    ? (todayAppointments as DashboardAppointment[]).filter(a => a.id !== nextAppointment.id)
    : (todayAppointments as DashboardAppointment[])

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {greeting}, {firstName}
          </h1>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/owners/new" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
            <Plus size={13} />
            Nuevo dueño
          </Link>
          <NewAppointmentButton team={team ?? []} businessHours={businessHours} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-12">
        <div className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <p className="label-overline text-muted-foreground/50">Citas de hoy</p>
              {todayAppointments.length > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {todayAppointments.length}
                </span>
              )}
            </div>

            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-xl bg-muted/30">
                <Calendar className="text-muted-foreground/20 mb-2" size={24} />
                <p className="text-xs text-muted-foreground">No hay citas para hoy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nextAppointment && <NextAppointmentCard appointment={nextAppointment} />}
                {otherAppointments.length > 0 && (
                  <AppointmentQuickModal appointments={otherAppointments} />
                )}
              </div>
            )}
          </section>

          {futureAppointments.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="label-overline text-muted-foreground/50">Próximas citas</p>
                <Link href="/dashboard/appointments" className="text-[10px] font-medium text-primary hover:underline">
                  Ver agenda completa
                </Link>
              </div>
              <div className="space-y-2">
                {futureAppointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-2">
          <p className="label-overline text-muted-foreground/50 px-1 mb-3">Módulos</p>

          <Link href="/dashboard/owners" className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <Users size={17} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">Dueños</p>
              <p className="text-xs text-muted-foreground mt-1">Directorio de clientes y responsables</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
          </Link>

          <Link href="/dashboard/pets" className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <PawPrint size={17} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">Mascotas</p>
              <p className="text-xs text-muted-foreground mt-1">Expedientes clínicos y búsqueda por paciente</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
          </Link>

          <Link href="/dashboard/appointments" className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <Calendar size={17} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">Agenda</p>
              <p className="text-xs text-muted-foreground mt-1">Citas programadas y confirmaciones pendientes</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
          </Link>

          {profile?.role === 'admin' && (
            <Link href="/dashboard/settings/team" className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all">
              <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <Settings2 size={17} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-none">Equipo</p>
                <p className="text-xs text-muted-foreground mt-1">Roles, accesos e invitaciones</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
            </Link>
          )}
        </div>

        <div className="border-t border-border/60 pt-6">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground/60">
            <span>{tenant?.name}</span>
            <span>{tenant?.type === 'enterprise' ? 'Plan empresa' : 'Plan individual'}</span>
            <span className="font-mono">{user?.id.split('-')[0]}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
