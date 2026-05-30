'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Calendar, Plus, Users, PawPrint, ChevronRight, Stethoscope } from 'lucide-react'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'
import { AppointmentDetailDialog } from '@/components/appointments/AppointmentDetailDialog'
import type { DashboardAppointment } from './DashboardAppointmentCard'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

interface TeamMember { id: string; full_name: string }

interface Metrics { total: number; completed: number; pendingConfirm: number }

interface Props {
  greeting: string
  firstName: string
  today: string
  nextAppointment: DashboardAppointment | null
  todayAppointments: DashboardAppointment[]
  futureAppointments: DashboardAppointment[]
  metrics: Metrics
  team: TeamMember[]
  businessHours: BusinessHoursConfig
  role: string
}

const STATUS_CONFIG: Record<string, { stripe: string; badge: string; label: string }> = {
  scheduled: { stripe: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-800 border border-amber-200',      label: 'Sin confirmar' },
  confirmed:  { stripe: 'bg-primary',    badge: 'bg-primary/10 text-primary border border-primary/20',     label: 'Confirmada' },
  completed:  { stripe: 'bg-emerald-400',badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',label: 'Completada' },
  cancelled:  { stripe: 'bg-zinc-200',   badge: 'bg-muted text-muted-foreground border border-border',     label: 'Cancelada' },
  no_show:    { stripe: 'bg-zinc-200',   badge: 'bg-muted text-muted-foreground border border-border',     label: 'No presentó' },
}

const ACTIVE = ['scheduled', 'confirmed']

export function DashboardTwoColumn({
  greeting, firstName, today,
  nextAppointment, todayAppointments, futureAppointments,
  metrics, team, businessHours, role,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<DashboardAppointment | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [newApptOpen, setNewApptOpen] = useState(false)

  async function transition(newStatus: string) {
    if (!selected) return
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/appointments/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      setSelected(null)
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      {/* Greeting — full width */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground capitalize">{today}</p>
        <h1 className="text-2xl font-bold text-foreground mt-0.5">{greeting}, {firstName}</h1>
      </div>

      {/* CTA cards — full width */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <button
          type="button"
          onClick={() => setNewApptOpen(true)}
          className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
            <Calendar size={17} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Nueva cita</p>
            <p className="text-xs text-muted-foreground">Agenda una consulta</p>
          </div>
        </button>

        <Link
          href="/dashboard/records/new"
          className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-emerald-300 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
            <Stethoscope size={17} className="text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Nueva Consulta</p>
            <p className="text-xs text-muted-foreground">Paciente walk-in</p>
          </div>
        </Link>

        <Link
          href="/dashboard/owners/new"
          className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
            <Plus size={17} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Nuevo dueño</p>
            <p className="text-xs text-muted-foreground">Registrar cliente</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-8 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="sticky top-4 space-y-4">

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-xl font-bold text-foreground tabular-nums">{metrics.total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Hoy</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
              <p className="text-xl font-bold text-emerald-700 tabular-nums">{metrics.completed}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Listas</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
              <p className="text-xl font-bold text-amber-700 tabular-nums">{metrics.pendingConfirm}</p>
              <p className="text-[10px] text-amber-600 mt-0.5">Por confirmar</p>
            </div>
          </div>

          {/* Mini modules */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.1em] px-1 mb-2">Módulos</p>
            <div className="space-y-0.5">
              {[
                { href: '/dashboard/owners', icon: Users, label: 'Dueños' },
                { href: '/dashboard/pets', icon: PawPrint, label: 'Mascotas' },
                { href: '/dashboard/appointments', icon: Calendar, label: 'Agenda' },
                ...(role === 'admin'
                  ? [{ href: '/dashboard/settings/team', icon: Users, label: 'Equipo' }]
                  : []),
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <Icon size={14} className="text-foreground/40 shrink-0" />
                  {label}
                  <ChevronRight size={12} className="ml-auto text-foreground/20" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-8 min-w-0">

          {/* Today */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="label-overline text-muted-foreground/50">Citas de hoy</p>
              {metrics.total > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {metrics.total}
                </span>
              )}
            </div>

            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl bg-muted/20">
                <Calendar className="text-muted-foreground/20 mb-2" size={22} />
                <p className="text-xs text-muted-foreground">No hay citas para hoy</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {todayAppointments.map(apt => {
                  const cfg = STATUS_CONFIG[apt.status] ?? { stripe: 'bg-zinc-300', badge: 'bg-muted text-muted-foreground border border-border', label: apt.status }
                  const time = new Date(apt.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  const done = !ACTIVE.includes(apt.status)
                  const isNext = apt.id === nextAppointment?.id
                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => setSelected(apt)}
                      className={`w-full text-left flex items-stretch rounded-xl border overflow-hidden transition-all hover:shadow-sm ${
                        done
                          ? 'border-border/40 bg-muted/10 opacity-60 hover:opacity-80'
                          : isNext
                          ? 'border-primary/30 bg-primary/[0.03]'
                          : apt.status === 'scheduled'
                          ? 'border-amber-200/80 bg-amber-50/30'
                          : 'border-border bg-card hover:border-primary/30'
                      }`}
                    >
                      <div className={`w-1 shrink-0 ${cfg.stripe} ${done ? 'opacity-40' : ''}`} />
                      <div className="flex flex-col justify-center px-3 py-3 shrink-0 w-[4.5rem] border-r border-border/30">
                        <span className="text-sm font-mono font-semibold tabular-nums text-foreground leading-none">{time}</span>
                        {apt.duration_minutes && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">{apt.duration_minutes}m</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 px-3 py-3">
                        <p className={`text-sm font-semibold leading-none ${done ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {apt.pet?.name ?? '—'}
                          {apt.pet?.species && (
                            <span className="font-normal text-muted-foreground ml-1.5">{apt.pet.species.name}</span>
                          )}
                        </p>
                        {apt.owner && (
                          <p className="text-xs text-muted-foreground mt-0.5">{apt.owner.full_name}</p>
                        )}
                      </div>
                      <div className="flex items-center px-3 py-3 shrink-0">
                        {isNext ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground">
                            Siguiente
                          </span>
                        ) : (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Upcoming */}
          {futureAppointments.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="label-overline text-muted-foreground/50">Próximas citas</p>
                <Link href="/dashboard/appointments" className="text-[10px] font-medium text-primary hover:underline">
                  Ver agenda →
                </Link>
              </div>
              <div className="space-y-1.5">
                {futureAppointments.map(apt => {
                  const cfg = STATUS_CONFIG[apt.status] ?? { stripe: 'bg-zinc-300', badge: 'bg-muted text-muted-foreground border border-border', label: apt.status }
                  const date = new Date(apt.scheduled_at).toLocaleDateString('es-MX', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })
                  const time = new Date(apt.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => setSelected(apt)}
                      className="w-full text-left flex items-stretch rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-sm hover:border-primary/30"
                    >
                      <div className={`w-1 shrink-0 ${cfg.stripe}`} />
                      <div className="flex flex-col justify-center px-3 py-3 shrink-0 w-[4.5rem] border-r border-border/30">
                        <span className="text-sm font-mono font-semibold tabular-nums text-foreground leading-none">{time}</span>
                        {apt.duration_minutes && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">{apt.duration_minutes}m</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 px-3 py-3">
                        <p className="text-sm font-semibold text-foreground leading-none">
                          {apt.pet?.name ?? '—'}
                          {apt.pet?.species && (
                            <span className="font-normal text-muted-foreground ml-1.5">{apt.pet.species.name}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {apt.owner?.full_name && <span>{apt.owner.full_name} · </span>}
                          {date}
                        </p>
                      </div>
                      <div className="flex items-center px-3 py-3 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${cfg.badge}`}>{cfg.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      <AppointmentDetailDialog
        open={selected !== null}
        onOpenChange={(open) => { if (!open) setSelected(null) }}
        appointment={selected}
        onTransition={transition}
        loadingStatus={loading}
      />

      <NewAppointmentModal
        isOpen={newApptOpen}
        onClose={() => setNewApptOpen(false)}
        team={team}
        businessHours={businessHours}
      />
    </>
  )
}
