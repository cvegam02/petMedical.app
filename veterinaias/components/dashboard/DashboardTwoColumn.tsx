'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Clock, Calendar, Phone, X, Plus, Users, PawPrint, ChevronRight, ArrowRight, Stethoscope } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'
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

const STATUS_CONFIG: Record<string, { accent: string; badge: string; label: string }> = {
  scheduled: { accent: 'border-l-amber-400',   badge: 'bg-amber-100 text-amber-800 border border-amber-300',   label: 'Sin confirmar' },
  confirmed:  { accent: 'border-l-primary',     badge: 'bg-primary/10 text-primary border border-primary/30',  label: 'Confirmada' },
  completed:  { accent: 'border-l-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Completada' },
  cancelled:  { accent: 'border-l-zinc-300',    badge: 'bg-muted text-muted-foreground border border-border',  label: 'Cancelada' },
  no_show:    { accent: 'border-l-zinc-300',    badge: 'bg-muted text-muted-foreground border border-border',  label: 'No presentó' },
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

  const isActive = selected ? ACTIVE.includes(selected.status) : false

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
            <p className="text-sm font-semibold text-foreground">Consulta sin cita</p>
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
                  const cfg = STATUS_CONFIG[apt.status] ?? { dot: 'bg-zinc-300', label: apt.status }
                  const time = new Date(apt.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  const done = !ACTIVE.includes(apt.status)
                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => setSelected(apt)}
                      className={`w-full text-left flex items-center gap-4 pl-4 pr-4 py-3 rounded-xl border-y border-r border-l-4 transition-all hover:shadow-sm ${cfg.accent} ${
                        done
                          ? 'border-y-border/40 border-r-border/40 bg-muted/10 opacity-60 hover:opacity-80'
                          : apt.id === nextAppointment?.id
                          ? 'border-y-primary/20 border-r-primary/20 bg-primary/5'
                          : apt.status === 'scheduled'
                          ? 'border-y-amber-200 border-r-amber-200 bg-amber-50/40'
                          : 'border-y-border border-r-border bg-card hover:border-r-primary/30 hover:border-y-primary/30'
                      }`}
                    >
                      <span className="text-sm font-mono text-muted-foreground w-11 shrink-0 tabular-nums">{time}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-none ${done ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {apt.pet?.name ?? '—'}
                          {apt.pet?.species && (
                            <span className="font-normal text-muted-foreground ml-1.5">
                              {apt.pet.species.name}
                            </span>
                          )}
                        </p>
                        {apt.owner && (
                          <p className="text-xs text-muted-foreground mt-0.5">{apt.owner.full_name}</p>
                        )}
                      </div>
                      {apt.id === nextAppointment?.id ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md shrink-0 bg-primary text-primary-foreground">
                          Siguiente
                        </span>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md shrink-0 ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      )}
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
                  const cfg = STATUS_CONFIG[apt.status] ?? { dot: 'bg-zinc-300', label: apt.status }
                  const date = new Date(apt.scheduled_at).toLocaleDateString('es-MX', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })
                  const time = new Date(apt.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => setSelected(apt)}
                      className={`w-full text-left flex items-center gap-4 pl-4 pr-4 py-3 rounded-xl border-y border-r border-l-4 bg-card hover:shadow-sm transition-all ${cfg.accent} border-y-border border-r-border hover:border-y-primary/30 hover:border-r-primary/30`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-none">
                          {apt.pet?.name ?? '—'}
                          {apt.pet?.species && (
                            <span className="font-normal text-muted-foreground ml-1.5">{apt.pet.species.name}</span>
                          )}
                        </p>
                        {apt.owner && (
                          <p className="text-xs text-muted-foreground mt-0.5">{apt.owner.full_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground capitalize tabular-nums">{date} · {time}</span>
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

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setSelected(null) }}
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de cita"
          tabIndex={-1}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mb-2 ${STATUS_CONFIG[selected.status]?.badge ?? 'bg-muted text-muted-foreground'}`}>
                    {STATUS_CONFIG[selected.status]?.label ?? selected.status}
                  </span>
                  <h2 className="text-2xl font-bold font-heading text-foreground leading-tight">
                    {selected.pet?.name ?? '—'}
                  </h2>
                  {selected.pet?.species && (
                    <p className="text-sm text-muted-foreground mt-0.5">{selected.pet.species.name}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 mt-0.5"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="px-6 py-4 border-t border-border/60 space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar size={13} className="text-muted-foreground shrink-0" />
                <span className="capitalize text-foreground">
                  {new Date(selected.scheduled_at).toLocaleDateString('es-MX', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Clock size={13} className="text-muted-foreground shrink-0" />
                <span className="text-foreground font-medium tabular-nums">
                  {new Date(selected.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-muted-foreground">· {selected.duration_minutes} min</span>
              </div>
              {selected.owner && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone size={13} className="text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground">{selected.owner.full_name}</span>
                  {selected.owner.phone && (
                    <a
                      href={`tel:${selected.owner.phone}`}
                      className="text-xs text-primary hover:underline tabular-nums"
                    >
                      {selected.owner.phone}
                    </a>
                  )}
                </div>
              )}
              {selected.reason && (
                <p className="text-sm text-muted-foreground italic pl-[21px]">{selected.reason}</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 pt-4 border-t border-border/60">
              {isActive ? (
                <>
                  <Link
                    href={`/dashboard/pets/${selected.pet?.id}/records/new?appointmentId=${selected.id}`}
                    className={`${buttonVariants({})} w-full justify-center gap-2 py-3 text-base font-semibold`}
                  >
                    Iniciar consulta
                    <ArrowRight size={16} />
                  </Link>

                  {selected.status === 'scheduled' && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => transition('confirmed')}
                      disabled={loading === 'confirmed'}
                    >
                      {loading === 'confirmed' ? 'Confirmando…' : 'Confirmar cita'}
                    </Button>
                  )}

                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                      type="button"
                      onClick={() => transition('no_show')}
                      disabled={loading === 'no_show'}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    >
                      {loading === 'no_show' ? 'Guardando…' : 'No se presentó'}
                    </button>
                    <span className="text-border text-xs">·</span>
                    <button
                      type="button"
                      onClick={() => transition('cancelled')}
                      disabled={loading === 'cancelled'}
                      className="text-xs text-destructive/60 hover:text-destructive transition-colors disabled:opacity-40"
                    >
                      {loading === 'cancelled' ? 'Guardando…' : 'Cancelar cita'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-center text-muted-foreground py-1">
                  {selected.status === 'completed' && 'Esta cita ya fue completada.'}
                  {selected.status === 'cancelled' && 'Esta cita fue cancelada.'}
                  {selected.status === 'no_show' && 'El paciente no se presentó.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <NewAppointmentModal
        isOpen={newApptOpen}
        onClose={() => setNewApptOpen(false)}
        team={team}
        businessHours={businessHours}
      />
    </>
  )
}
