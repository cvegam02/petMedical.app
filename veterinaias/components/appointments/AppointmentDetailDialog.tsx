'use client'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Phone, Cat, Dog, PawPrint } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import { serviceTypeConfig } from '@/lib/constants/service-type'
import { SERVICE_PANELS } from './panels'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

interface AppointmentDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: DashboardAppointment | null
  onUpdated?: () => void
  /** @deprecated panels own their transitions — kept for call-site compat */
  onTransition?: (newStatus: string) => void
  /** @deprecated panels own their loading state — kept for call-site compat */
  loadingStatus?: string | null
}

function speciesIcon(name: string | undefined) {
  const s = (name ?? '').toLowerCase()
  if (s.includes('fel') || s.includes('gat')) return Cat
  if (s.includes('can') || s.includes('perr')) return Dog
  return PawPrint
}

export function AppointmentDetailDialog({
  open,
  onOpenChange,
  appointment,
}: AppointmentDetailDialogProps) {
  const router = useRouter()

  if (!appointment) return null

  const statusCfg = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
  const serviceType = appointment.service_type ?? 'consultation'
  const isGrooming = serviceType === 'grooming'
  const svc = serviceTypeConfig(serviceType)
  const ServiceIcon = svc.Icon
  const SpeciesIcon = speciesIcon(appointment.pet?.species?.name)
  const Panel = SERVICE_PANELS[serviceType] ?? SERVICE_PANELS.consultation!

  const dateObj = new Date(appointment.scheduled_at)
  const dateStr = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Accent bar by status */}
        <div className={`h-1.5 w-full ${statusCfg.stripe}`} />

        {/* Header */}
        <div className="px-6 pt-5 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl border border-border bg-muted/40 text-muted-foreground flex items-center justify-center shrink-0">
              <SpeciesIcon size={24} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="mb-0">
                <DialogTitle className="text-xl font-bold text-foreground leading-tight truncate">
                  {appointment.pet?.name ?? '—'}
                </DialogTitle>
              </DialogHeader>
              {appointment.pet?.species && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{appointment.pet.species.name}</p>
              )}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-border bg-muted/40 text-foreground/70">
                  <ServiceIcon size={10} strokeWidth={2.25} />{svc.label}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment info */}
        <div className="px-6 py-4 border-t border-border/60 space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <Calendar size={14} className="text-muted-foreground/60 shrink-0" />
            <span className="capitalize text-foreground">{dateStr}</span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <Clock size={14} className="text-muted-foreground/60 shrink-0" />
            <span className="text-foreground font-medium tabular-nums">{timeStr}</span>
            {!isGrooming && (
              <span className="text-muted-foreground">· {appointment.duration_minutes} min</span>
            )}
          </div>

          {appointment.owner && (
            <div className="flex items-center gap-2.5 text-sm">
              <Phone size={14} className="text-muted-foreground/60 shrink-0" />
              <span className="font-medium text-foreground truncate">{appointment.owner.full_name}</span>
              {appointment.owner.phone && (
                <a href={`tel:${appointment.owner.phone}`} className="text-xs text-primary hover:underline tabular-nums ml-auto shrink-0">
                  {appointment.owner.phone}
                </a>
              )}
            </div>
          )}

          {/* Reason (consultation) */}
          {appointment.reason && !isGrooming && (
            <div className="pl-[26px]">
              <p className="text-sm text-muted-foreground leading-relaxed italic">“{appointment.reason}”</p>
            </div>
          )}

          {/* Services (grooming) */}
          {isGrooming && appointment.reason && (
            <div className="pl-[26px]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50 mb-1.5">Servicios</p>
              <div className="flex flex-wrap gap-1">
                {appointment.reason.split(', ').filter(Boolean).map(s => (
                  <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-muted/40 text-foreground/70">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Service panel (actions) */}
        <div className="px-6 pb-6 pt-4 border-t border-border/60">
          <Panel
            appointment={appointment}
            onClose={() => onOpenChange(false)}
            onRefresh={() => router.refresh()}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
