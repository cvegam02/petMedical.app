'use client'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Phone, Scissors } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import { SERVICE_PANELS } from './panels'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

interface AppointmentDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: DashboardAppointment | null
  /** @deprecated panels own their transitions — kept for call-site compat */
  onTransition?: (newStatus: string) => void
  /** @deprecated panels own their loading state — kept for call-site compat */
  loadingStatus?: string | null
}

export function AppointmentDetailDialog({
  open,
  onOpenChange,
  appointment,
}: AppointmentDetailDialogProps) {
  const router = useRouter()

  if (!appointment) return null

  const statusCfg = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
  const isGrooming = (appointment.service_type ?? 'consultation') === 'grooming'

  const serviceType = appointment.service_type ?? 'consultation'
  const Panel = SERVICE_PANELS[serviceType] ?? SERVICE_PANELS.consultation!

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

          {/* Grooming services chips */}
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

        {/* Service panel */}
        <Panel
          appointment={appointment}
          onClose={() => onOpenChange(false)}
          onRefresh={() => router.refresh()}
        />
      </DialogContent>
    </Dialog>
  )
}
