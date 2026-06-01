'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Calendar, Clock, Phone, Scissors, CheckCircle2, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

const ACTIVE_STATUSES = ['scheduled', 'confirmed']

interface GroomingSession {
  id: string
  started_at: string | null
  ended_at: string | null
  notes: string | null
  services: { id: string; service_name: string }[]
}

interface AppointmentDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: DashboardAppointment | null
  onTransition: (newStatus: string) => void
  loadingStatus: string | null
}

function formatDuration(startedAt: string, endedAt: string): string {
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function AppointmentDetailDialog({
  open,
  onOpenChange,
  appointment,
  onTransition,
  loadingStatus,
}: AppointmentDetailDialogProps) {
  const router = useRouter()
  const [startingSession, setStartingSession] = useState(false)
  const [session, setSession] = useState<GroomingSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(false)
  const [concludeNotes, setConcludeNotes] = useState('')
  const [concluding, setConcluding] = useState(false)

  const isGrooming = (appointment?.service_type ?? 'consultation') === 'grooming'
  const isActive = ACTIVE_STATUSES.includes(appointment?.status ?? '')
  const appointmentId = appointment?.id

  // Fetch linked grooming session whenever a grooming appointment dialog opens
  useEffect(() => {
    if (!open || !isGrooming || !appointmentId) {
      setSession(null)
      return
    }
    setLoadingSession(true)
    setConcludeNotes('')
    fetch(`/api/servicios/estetica?appointmentId=${appointmentId}`)
      .then(r => r.json())
      .then(json => setSession(json.data ?? null))
      .catch(() => setSession(null))
      .finally(() => setLoadingSession(false))
  }, [open, appointmentId, isGrooming])

  if (!appointment) return null

  const statusCfg = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled

  const sessionInProgress = session && session.started_at && !session.ended_at
  const sessionCompleted = session && session.ended_at

  async function handleStartGroomingSession() {
    if (!appointment!.pet?.id) return
    setStartingSession(true)
    try {
      const res = await fetch('/api/servicios/estetica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: appointment!.pet.id,
          appointment_id: appointment!.id,
          session_date: new Date().toISOString().split('T')[0],
          started_at: new Date().toISOString(),
          services: [],
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al iniciar sesión'); return }
      toast.success('Sesión de estética iniciada')
      // Refresh session in dialog without closing
      setSession(json.data)
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setStartingSession(false)
    }
  }

  async function handleConcludeSession() {
    if (!session?.id) return
    setConcluding(true)
    try {
      const endedAt = new Date().toISOString()
      const res = await fetch(`/api/servicios/estetica/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ended_at: endedAt,
          ...(concludeNotes.trim() ? { notes: concludeNotes.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al concluir sesión'); return }

      // Also mark the appointment as completed
      await fetch(`/api/appointments/${appointment!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      toast.success('Servicio de estética concluido')
      setSession({ ...json.data, services: session.services })
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setConcluding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-5">
          <DialogHeader className="mb-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusCfg.className}`}>
                {statusCfg.label}
              </span>
              {isGrooming && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-violet-200 bg-violet-50 text-violet-700">
                  <Scissors size={10} />Estética
                </span>
              )}
            </div>
            <DialogTitle className="text-2xl font-bold font-heading text-foreground leading-tight">
              {appointment.pet?.name ?? '—'}
            </DialogTitle>
          </DialogHeader>
          {appointment.pet?.species && (
            <p className="text-sm text-muted-foreground mt-0.5">{appointment.pet.species.name}</p>
          )}
        </div>

        {/* Appointment info */}
        <div className="px-6 py-4 border-t border-border/60 space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <Calendar size={13} className="text-muted-foreground shrink-0" />
            <span className="capitalize text-foreground">
              {new Date(appointment.scheduled_at).toLocaleDateString('es-MX', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <Clock size={13} className="text-muted-foreground shrink-0" />
            <span className="text-foreground font-medium tabular-nums">
              {new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', {
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
            {!isGrooming && (
              <span className="text-muted-foreground">· {appointment.duration_minutes} min</span>
            )}
          </div>

          {appointment.owner && (
            <div className="flex items-center gap-2.5 text-sm">
              <Phone size={13} className="text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground">{appointment.owner.full_name}</span>
              {appointment.owner.phone && (
                <a href={`tel:${appointment.owner.phone}`} className="text-xs text-primary hover:underline tabular-nums">
                  {appointment.owner.phone}
                </a>
              )}
            </div>
          )}

          {appointment.reason && !isGrooming && (
            <p className="text-sm text-muted-foreground italic pl-[21px]">{appointment.reason}</p>
          )}

          {/* Grooming services from appointment */}
          {isGrooming && appointment.reason && (
            <div className="flex flex-wrap gap-1 pl-[21px]">
              {appointment.reason.split(', ').filter(Boolean).map(svc => (
                <span key={svc} className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                  {svc}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Grooming session block */}
        {isGrooming && (
          <div className="px-6 py-4 border-t border-border/60">
            {loadingSession ? (
              <p className="text-xs text-muted-foreground">Cargando sesión...</p>
            ) : sessionCompleted ? (
              /* Completed session */
              <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <p className="text-sm font-semibold text-green-800">Servicio completado</p>
                </div>
                <div className="pl-[22px] space-y-1 text-xs text-green-700">
                  <p>Inicio: {formatTime(session!.started_at!)}</p>
                  <p>Salida: {formatTime(session!.ended_at!)}</p>
                  <p className="font-semibold">Duración: {formatDuration(session!.started_at!, session!.ended_at!)}</p>
                  {session!.notes && <p className="text-green-600 italic">{session!.notes}</p>}
                </div>
              </div>
            ) : sessionInProgress ? (
              /* Session in progress — show conclude form */
              <div className="space-y-3">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Timer size={14} className="text-amber-600 shrink-0" />
                    <p className="text-sm font-semibold text-amber-800">Sesión en curso</p>
                  </div>
                  <p className="text-xs text-amber-700 pl-[22px]">
                    Inicio: {formatTime(session!.started_at!)}
                  </p>
                  {session!.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pl-[22px]">
                      {session!.services.map(sv => (
                        <span key={sv.id} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          {sv.service_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notas finales (opcional)</Label>
                  <Textarea
                    placeholder="Observaciones del servicio, estado del pelaje..."
                    value={concludeNotes}
                    onChange={e => setConcludeNotes(e.target.value)}
                    className="resize-none h-16 text-sm"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleConcludeSession}
                  disabled={concluding}
                >
                  {concluding ? 'Guardando...' : 'Concluir Servicio'}
                </Button>
              </div>
            ) : (
              /* No session yet */
              null
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-6 pt-4 border-t border-border/60">
          {isGrooming ? (
            /* Grooming primary actions */
            !session && !loadingSession ? (
              isActive ? (
                <div className="space-y-2">
                  <Button
                    className="w-full justify-center gap-2 font-semibold"
                    onClick={handleStartGroomingSession}
                    disabled={startingSession}
                  >
                    <Scissors size={15} />
                    {startingSession ? 'Iniciando...' : 'Iniciar sesión de estética'}
                  </Button>
                  <div className="flex items-center justify-center gap-4 mt-3">
                    {appointment.status === 'scheduled' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onTransition('confirmed')}
                          disabled={loadingStatus === 'confirmed'}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                        >
                          {loadingStatus === 'confirmed' ? 'Confirmando…' : 'Confirmar cita'}
                        </button>
                        <span className="text-border text-xs">·</span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => onTransition('no_show')}
                      disabled={loadingStatus === 'no_show'}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    >
                      {loadingStatus === 'no_show' ? 'Guardando…' : 'No se presentó'}
                    </button>
                    <span className="text-border text-xs">·</span>
                    <button
                      type="button"
                      onClick={() => onTransition('cancelled')}
                      disabled={loadingStatus === 'cancelled'}
                      className="text-xs text-destructive/60 hover:text-destructive transition-colors disabled:opacity-40"
                    >
                      {loadingStatus === 'cancelled' ? 'Guardando…' : 'Cancelar'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground py-1">
                  {appointment.status === 'completed' && 'Cita completada.'}
                  {appointment.status === 'cancelled' && 'Cita cancelada.'}
                  {appointment.status === 'no_show' && 'El cliente no se presentó.'}
                </p>
              )
            ) : sessionCompleted ? (
              <p className="text-sm text-center text-muted-foreground py-1">Servicio completado.</p>
            ) : null
          ) : (
            /* Consultation actions (unchanged) */
            isActive ? (
              <>
                <Link
                  href={`/dashboard/pets/${appointment.pet?.id}/records/new?appointmentId=${appointment.id}`}
                  className={`${buttonVariants({})} w-full justify-center gap-2 py-3 text-base font-semibold`}
                >
                  Iniciar consulta
                  <ArrowRight size={16} />
                </Link>

                {appointment.status === 'scheduled' && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => onTransition('confirmed')}
                    disabled={loadingStatus === 'confirmed'}
                  >
                    {loadingStatus === 'confirmed' ? 'Confirmando…' : 'Confirmar cita'}
                  </Button>
                )}

                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    type="button"
                    onClick={() => onTransition('no_show')}
                    disabled={loadingStatus === 'no_show'}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {loadingStatus === 'no_show' ? 'Guardando…' : 'No se presentó'}
                  </button>
                  <span className="text-border text-xs">·</span>
                  <button
                    type="button"
                    onClick={() => onTransition('cancelled')}
                    disabled={loadingStatus === 'cancelled'}
                    className="text-xs text-destructive/60 hover:text-destructive transition-colors disabled:opacity-40"
                  >
                    {loadingStatus === 'cancelled' ? 'Guardando…' : 'Cancelar cita'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-center text-muted-foreground py-1">
                {appointment.status === 'completed' && 'Esta cita ya fue completada.'}
                {appointment.status === 'cancelled' && 'Esta cita fue cancelada.'}
                {appointment.status === 'no_show' && 'El paciente no se presentó.'}
              </p>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
