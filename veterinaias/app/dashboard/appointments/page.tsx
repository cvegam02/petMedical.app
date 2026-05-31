import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import Link from 'next/link'
import { CalendarDays, LayoutList, Calendar } from 'lucide-react'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'
import { NewAppointmentButton } from '@/components/appointments/NewAppointmentButton'
import { CalendarView } from '@/components/appointments/CalendarView'

const TABS = [
  { key: 'hoy',       label: 'Hoy' },
  { key: 'proximas',  label: 'Próximas' },
  { key: 'confirmar', label: 'Por confirmar' },
]

const VALID_TABS = ['hoy', 'proximas', 'confirmar'] as const

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; vista?: string }>
}) {
  const { tab: rawTab = 'hoy', vista = 'calendario' } = await searchParams
  const tab = (VALID_TABS as readonly string[]).includes(rawTab) ? rawTab : 'hoy'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, tenants(type, settings)')
    .eq('id', user!.id)
    .single() as any

  const tenant = profile?.tenants
  const businessHours = (tenant as any)?.settings?.business_hours ?? DEFAULT_BUSINESS_HOURS
  const showAll =
    tenant?.type === 'individual' ||
    profile?.role === 'admin' ||
    profile?.role === 'assistant' ||
    profile?.role === 'staff'

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('full_name') as { data: { id: string; full_name: string }[] | null }

  let list: any[] = []
  if (vista !== 'calendario') {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrowStart = new Date(todayStart.getTime() + 86_400_000)
    const in8Days = new Date(todayStart.getTime() + 8 * 86_400_000)
    const in2Days = new Date(now.getTime() + 2 * 86_400_000)

    let query = (supabase.from('appointments') as any)
      .select(`
        id, status, scheduled_at, duration_minutes, reason, notes, appointment_type,
        pet:pet_id(id, name, species:species_id(name)),
        owner:owner_id(id, full_name, phone),
        assigned_to_profile:assigned_to(id, full_name)
      `)
      .eq('tenant_id', profile?.tenant_id)
      .order('scheduled_at', { ascending: true })

    if (!showAll && profile?.role === 'doctor') {
      query = query.eq('assigned_to', user!.id)
    }

    if (tab === 'hoy') {
      query = query
        .gte('scheduled_at', todayStart.toISOString())
        .lt('scheduled_at', tomorrowStart.toISOString())
    } else if (tab === 'proximas') {
      query = query
        .gte('scheduled_at', tomorrowStart.toISOString())
        .lt('scheduled_at', in8Days.toISOString())
    } else if (tab === 'confirmar') {
      query = query
        .gte('scheduled_at', now.toISOString())
        .lt('scheduled_at', in2Days.toISOString())
        .eq('status', 'scheduled')
    }

    const { data: appointments } = await query
    list = (appointments as any[]) ?? []
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Agenda</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Citas</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Lista / Calendario */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <Link
                href="/dashboard/appointments?vista=lista"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  vista !== 'calendario'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <LayoutList size={13} />
                Lista
              </Link>
              <Link
                href="/dashboard/appointments?vista=calendario"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                  vista === 'calendario'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Calendar size={13} />
                Calendario
              </Link>
            </div>

            <NewAppointmentButton team={team ?? []} businessHours={businessHours} />
          </div>
        </div>

        {/* Tabs — solo en vista lista */}
        {vista !== 'calendario' && (
          <div className="flex gap-1 border-b border-border">
            {TABS.map(t => (
              <Link
                key={t.key}
                href={`/dashboard/appointments?tab=${t.key}&vista=lista`}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Vista Calendario */}
      {vista === 'calendario' ? (
        <CalendarView businessHours={businessHours} />
      ) : (
        /* Vista Lista */
        <div className="max-w-2xl mx-auto w-full">
          {tab === 'confirmar' && list.length > 0 && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15 text-sm text-foreground">
              Estas citas necesitan confirmación. Llama al dueño y marca la cita como confirmada.
            </div>
          )}

          {list.length === 0 ? (
            <div className="text-center py-20 rounded-[2rem] border-2 border-dashed border-border/60 bg-muted/10">
              <div className="w-14 h-14 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center mx-auto mb-5">
                <CalendarDays size={22} className="text-muted-foreground/25" />
              </div>
              <p className="font-bold text-foreground text-lg tracking-tight">
                {tab === 'hoy' ? 'Sin citas para hoy' : tab === 'proximas' ? 'Sin citas próximas' : 'Sin citas por confirmar'}
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-[260px] mx-auto leading-relaxed">
                {tab === 'confirmar' ? 'Todas las citas próximas están confirmadas.' : 'Agrega una nueva cita para comenzar.'}
              </p>
              {tab !== 'confirmar' && (
                <div className="mt-7 flex justify-center">
                  <NewAppointmentButton team={team ?? []} businessHours={businessHours} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((apt: any) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  showPhone={tab === 'confirmar'}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
