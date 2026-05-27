import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
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
  const { tab = 'hoy' } = await searchParams
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-0.5">
            Agenda
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Citas</h1>
        </div>
        <Link href="/dashboard/appointments/new" className={buttonVariants({ size: 'sm' })}>
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
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <p className="font-medium text-foreground mb-1">
            {tab === 'hoy' ? 'Sin citas para hoy' : tab === 'proximas' ? 'Sin citas próximas' : 'No hay citas pendientes de confirmar'}
          </p>
          <p className="text-sm text-muted-foreground">
            {tab === 'confirmar' ? 'Todas las citas próximas están confirmadas.' : 'Agrega una nueva cita para comenzar.'}
          </p>
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
