'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Calendar, Clock, Phone, Scissors } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

const ACTIVE_STATUSES = ['scheduled', 'confirmed']

interface AppointmentDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: DashboardAppointment | null
  /** Called with the new status string when a transition is requested */
  onTransition: (newStatus: string) => void
  /** Tracks which transition is in-flight; null when idle */
  loadingStatus: string | null
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

  if (!appointment) return null

  const statusCfg = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
  const isActive = ACTIVE_STATUSES.includes(appointment.status)
  const isGrooming = (appointment.appointment_type ?? 'consultation') === 'grooming'

  async function handleStartGroomingSession() {
    if (!appointment?.pet?.id) return
    setStartingSession(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/servicios/estetica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: appointment.pet.id,
          appointment_id: appointment.id,
          session_date: today,
          started_at: new Date().toISOString(),
          services: [],
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al iniciar sesión'); return }
      toast.success('Sesión de estética iniciada')
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setStartingSession(false)
    }
  }

  // base-ui passes (open, eventDetails) — we only need the boolean
  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-5">
          <DialogHeader className="mb-0">
            <span
              className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mb-2 border ${statusCfg.className}`}
            >
              {statusCfg.label}
            </span>
            <DialogTitle className="text-2xl font-bold font-heading text-foreground leading-tight">
              {appointment.pet?.name ?? '—'}
            </DialogTitle>
          </DialogHeader>
          {appointment.pet?.species && (
            <p className="text-sm text-muted-foreground mt-0.5">{appointment.pet.species.name}</p>
          )}
        </div>

        {/* Info */}
        <div className="px-6 py-4 border-t border-border/60 space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <Calendar size={13} className="text-muted-foreground shrink-0" />
            <span className="capitalize text-foreground">
              {new Date(appointment.scheduled_at).toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <Clock size={13} className="text-muted-foreground shrink-0" />
            <span className="text-foreground font-medium tabular-nums">
              {new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className="text-muted-foreground">· {appointment.duration_minutes} min</span>
          </div>

          {appointment.owner && (
            <div className="flex items-center gap-2.5 text-sm">
              <Phone size={13} className="text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground">{appointment.owner.full_name}</span>
              {appointment.owner.phone && (
                <a
                  href={`tel:${appointment.owner.phone}`}
                  className="text-xs text-primary hover:underline tabular-nums"
                >
                  {appointment.owner.phone}
                </a>
              )}
            </div>
          )}

          {appointment.reason && (
            <p className="text-sm text-muted-foreground italic pl-[21px]">{appointment.reason}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-4 border-t border-border/60">
          {isActive ? (
            <>
              {isGrooming ? (
                <Button
                  className="w-full justify-center gap-2 py-3 text-base font-semibold"
                  onClick={handleStartGroomingSession}
                  disabled={startingSession}
                >
                  <Scissors size={16} />
                  {startingSession ? 'Iniciando...' : 'Iniciar sesión de estética'}
                </Button>
              ) : (
                <Link
                  href={`/dashboard/pets/${appointment.pet?.id}/records/new?appointmentId=${appointment.id}`}
                  className={`${buttonVariants({})} w-full justify-center gap-2 py-3 text-base font-semibold`}
                >
                  Iniciar consulta
                  <ArrowRight size={16} />
                </Link>
              )}

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
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
