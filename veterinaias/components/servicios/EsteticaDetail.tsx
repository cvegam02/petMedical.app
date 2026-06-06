'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ChevronLeft, Clock, User, Info, Phone, Save, Scissors,
} from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { PetExpedienteModal } from '@/components/pets/PetExpedienteModal'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'

interface GroomingService { id: string; service_name: string }
interface GroomingRecord {
  visit_id: string
  intake_notes: string | null
  notes: string | null
  services: GroomingService[]
}
interface ServiceVisit {
  id: string
  status: string
  started_at: string | null
  ended_at: string | null
  grooming_record: GroomingRecord[] | GroomingRecord | null
}
interface Appointment {
  id: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  scheduled_at: string
  reason: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null } | null
  assigned_to_profile: { id: string; full_name: string } | null
  service_visit: ServiceVisit[] | ServiceVisit | null
}

interface Props {
  appointment: Appointment
  visitId?: string
}

function formatDuration(startedAt: string, endedAt: string): string {
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function EsteticaDetail({ appointment, visitId: visitIdOverride }: Props) {
  const router = useRouter()
  const [concludeNotes, setConcludeNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const visit: ServiceVisit | null = Array.isArray(appointment.service_visit)
    ? (appointment.service_visit[0] ?? null)
    : appointment.service_visit

  const record: GroomingRecord | null = visit
    ? (Array.isArray(visit.grooming_record) ? (visit.grooming_record[0] ?? null) : visit.grooming_record)
    : null

  const inProgress = visit !== null && visit.started_at !== null && visit.ended_at === null
  const isCompleted = visit !== null && visit.ended_at !== null

  const displayServices: string[] = record?.services?.length
    ? record.services.map(s => s.service_name)
    : (appointment.reason ?? '').split(', ').filter(Boolean)

  const PetIcon = getSpeciesIcon(appointment.pet?.species?.name)

  const dateObj = new Date(appointment.scheduled_at)
  const dateStr = dateObj.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  // Status badge: derive from visit state when applicable
  const statusCfg = inProgress
    ? { label: 'En curso', className: 'text-amber-700 bg-amber-50 border-amber-200' }
    : APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled

  async function handleTransition(newStatus: string) {
    setActionLoading(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      router.refresh()
    } catch { toast.error('Error de red') } finally { setActionLoading(null) }
  }

  async function handleInitiate() {
    if (!appointment.pet?.id) { toast.error('Mascota no encontrada'); return }
    setActionLoading('initiate')
    try {
      const res = await fetch('/api/servicios/estetica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointment.id,
          pet_id: appointment.pet.id,
          session_date: appointment.scheduled_at.slice(0, 10),
          started_at: new Date().toISOString(),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al iniciar sesión'); return }
      toast.success('Sesión iniciada')
      router.refresh()
    } catch { toast.error('Error de red') } finally { setActionLoading(null) }
  }

  async function handleConclude() {
    const resolvedVisitId = visitIdOverride ?? visit?.id
    if (!resolvedVisitId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/servicios/estetica/${resolvedVisitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ended_at: new Date().toISOString(), notes: concludeNotes.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al concluir'); return }
      toast.success('Sesión concluida')
      router.refresh()
    } catch { toast.error('Error de red') } finally { setSubmitting(false) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard/servicios/estetica"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a estética
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-[1.5px] bg-secondary-foreground/20 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-secondary-foreground uppercase tracking-[0.2em]">Detalle de estética</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {appointment.pet?.name ?? '—'}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="font-medium text-foreground">{appointment.owner?.full_name ?? '—'}</span>
              <span>•</span>
              <span className="capitalize">{dateStr}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider border ${statusCfg.className}`}
            >
              {inProgress && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1.5" />}
              {statusCfg.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-8">

            {/* Session info */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Información de la sesión</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                <div className="space-y-1.5">
                  <p className="label-overline text-muted-foreground/50">Horario programado</p>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Clock size={16} className="text-muted-foreground/40" />
                    <span>{timeStr}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="label-overline text-muted-foreground/50">Groomer asignado</p>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <User size={16} className="text-muted-foreground/40" />
                    <span>{appointment.assigned_to_profile?.full_name ?? 'Pendiente de asignar'}</span>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <p className="label-overline text-muted-foreground/50">Servicios</p>
                  {displayServices.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {displayServices.map(name => (
                        <span
                          key={name}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin servicios especificados.</p>
                  )}
                </div>

                {record?.intake_notes && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Notas de ingreso</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{record.intake_notes}</p>
                  </div>
                )}

                {isCompleted && visit?.started_at && visit?.ended_at && (
                  <div className="space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Duración</p>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Clock size={16} className="text-muted-foreground/40" />
                      <span>{formatDuration(visit.started_at, visit.ended_at)}</span>
                    </div>
                  </div>
                )}

                {isCompleted && record?.notes && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Notas finales</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{record.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-8 border-t border-border/40">
              <p className="label-overline text-muted-foreground/50 mb-4">Acciones disponibles</p>

              {appointment.status === 'scheduled' && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => handleTransition('confirmed')}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'confirmed' ? 'Confirmando...' : 'Confirmar cita'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTransition('cancelled')}
                    disabled={actionLoading !== null}
                    className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    {actionLoading === 'cancelled' ? 'Cancelando...' : 'Cancelar cita'}
                  </Button>
                </div>
              )}

              {appointment.status === 'confirmed' && !visit && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={handleInitiate}
                    disabled={actionLoading !== null}
                    className="gap-2"
                  >
                    <Scissors size={14} />
                    {actionLoading === 'initiate' ? 'Iniciando...' : 'Iniciar sesión'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTransition('no_show')}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'no_show' ? '...' : 'No se presentó'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTransition('cancelled')}
                    disabled={actionLoading !== null}
                    className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    {actionLoading === 'cancelled' ? 'Cancelando...' : 'Cancelar cita'}
                  </Button>
                </div>
              )}

              {inProgress && (
                <p className="text-sm text-muted-foreground">
                  Sesión en curso — completa el formulario de conclusión a continuación.
                </p>
              )}

              {(appointment.status === 'completed' || appointment.status === 'cancelled' || appointment.status === 'no_show') && !inProgress && (
                <p className="text-sm text-muted-foreground">
                  {{
                    completed: 'Esta sesión fue completada.',
                    cancelled: 'Esta cita fue cancelada.',
                    no_show: 'El dueño no se presentó a esta cita.',
                  }[appointment.status]}
                </p>
              )}
            </div>
          </section>

          {/* Conclude form */}
          {inProgress && (
            <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <Scissors size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Concluir sesión</h3>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notas finales</Label>
                <Textarea
                  id="notes"
                  value={concludeNotes}
                  onChange={e => setConcludeNotes(e.target.value)}
                  placeholder="Observaciones, recomendaciones, estado del pelaje..."
                  className="resize-none h-28 bg-muted/30 focus:bg-white transition-all"
                />
              </div>
              <Button onClick={handleConclude} disabled={submitting} className="gap-2">
                <Save size={14} />
                {submitting ? 'Guardando...' : 'Concluir sesión'}
              </Button>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Owner card */}
          <section className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="label-overline text-muted-foreground/50 font-mono">Responsable</p>
              {appointment.owner?.id && (
                <Link
                  href={`/dashboard/owners/${appointment.owner.id}`}
                  className="text-[10px] text-primary hover:underline font-bold uppercase tracking-tighter"
                >
                  Ver perfil
                </Link>
              )}
            </div>
            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground leading-tight">
                {appointment.owner?.full_name ?? '—'}
              </h4>
              <div className="space-y-2.5">
                {appointment.owner?.phone && (
                  <a
                    href={`tel:${appointment.owner.phone}`}
                    className="flex items-center gap-3 text-xs text-muted-foreground group"
                  >
                    <div className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Phone size={12} />
                    </div>
                    <span>{appointment.owner.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Pet card */}
          {appointment.pet && (
            <section className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="label-overline text-muted-foreground/50 font-mono">Paciente</p>
                <PetExpedienteModal
                  petId={appointment.pet.id}
                  petName={appointment.pet.name}
                  trigger={
                    <button className="text-[10px] text-primary hover:underline font-bold uppercase tracking-tighter cursor-pointer">
                      Ver expediente
                    </button>
                  }
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary/40">
                  <PetIcon size={24} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-foreground leading-none">{appointment.pet.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {appointment.pet.species?.name ?? 'Especie no definida'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Metadata */}
          <div className="px-2 space-y-2">
            <Separator className="bg-border/40" />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/40 font-mono">
              <span>ID: {appointment.id.split('-')[0]}...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
