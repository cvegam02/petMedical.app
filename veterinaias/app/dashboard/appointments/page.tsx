import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, CalendarDays } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'

const TABS = [
  { key: 'hoy',      label: 'Hoy' },
  { key: 'proximas', label: 'Próximas' },
  { key: 'confirmar',label: 'Por confirmar' },
]

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab = 'hoy' } = await searchParams
  const VALID_TABS = ['hoy', 'proximas', 'confirmar'] as const
  const tab = (VALID_TABS as readonly string[]).includes(rawTab) ? rawTab : 'hoy'
  const supabase = await createClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000)
  const in8Days = new Date(todayStart.getTime() + 8 * 86_400_000)
  const in2Days = new Date(now.getTime() + 2 * 86_400_000)

  let query = (supabase.from('appointments') as any)
    .select(`
      id, status, scheduled_at, duration_minutes, reason, notes,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .order('scheduled_at', { ascending: true })

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
  const list = (appointments as any[]) ?? []

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Agenda</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Citas</h1>
        </div>
        <Link href="/dashboard/appointments/new" className={buttonVariants({ size: 'sm', className: 'shadow-lg shadow-primary/10 active:scale-[0.97] transition-all' })}>
          <Plus size={14} className="mr-1.5" />
          Nueva cita
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(t => (
          <Link
            key={t.key}
            href={`/dashboard/appointments?tab=${t.key}`}
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

      {/* Callout for confirmar tab */}
      {tab === 'confirmar' && list.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15 text-sm text-foreground">
          Estas citas necesitan confirmación. Llama al dueño y marca la cita como confirmada.
        </div>
      )}

      {/* List */}
      {list.length === 0 ? (
        <div className="text-center py-20 rounded-[2rem] border-2 border-dashed border-border/60 bg-zinc-50/50">
          <div className="w-14 h-14 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center mx-auto mb-5">
            <CalendarDays size={22} className="text-muted-foreground/25" />
          </div>
          <p className="font-bold text-foreground text-lg tracking-tight">
            {tab === 'hoy' ? 'Sin citas para hoy' : tab === 'proximas' ? 'Sin citas próximas' : 'Sin citas por confirmar'}
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[260px] mx-auto leading-relaxed">
            {tab === 'confirmar' ? 'Todas las citas próximas están confirmadas.' : 'Agrega una nueva cita para comenzar.'}
          </p>
          {tab !== 'confirmar' && (
            <Link
              href="/dashboard/appointments/new"
              className="mt-7 inline-flex items-center px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.95]"
            >
              <Plus size={13} className="mr-1.5" />
              Nueva cita
            </Link>
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
  )
}
