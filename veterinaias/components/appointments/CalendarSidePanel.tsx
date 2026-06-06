'use client'
import { useRouter } from 'next/navigation'
import { X, Calendar, Clock, Phone } from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import { serviceTypeConfig } from '@/lib/constants/service-type'
import { SERVICE_PANELS } from './panels'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

interface CalendarSidePanelProps {
  appointment: DashboardAppointment
  onClose: () => void
  onRefresh: () => void
}


export function CalendarSidePanel({ appointment, onClose, onRefresh }: CalendarSidePanelProps) {
  const router = useRouter()
  const statusCfg = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
  const serviceType = appointment.service_type ?? 'consultation'
  const isGrooming = serviceType === 'grooming'
  const svc = serviceTypeConfig(serviceType)
  const ServiceIcon = svc.Icon
  const SpeciesIcon = getSpeciesIcon(appointment.pet?.species?.name)
  const Panel = SERVICE_PANELS[serviceType] ?? SERVICE_PANELS.consultation!

  const dateObj = new Date(appointment.scheduled_at)
  const dateStr = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="w-72 shrink-0 border-l border-border flex flex-col overflow-hidden bg-card animate-in slide-in-from-right-4 duration-200">
      {/* Status stripe */}
      <div className={`h-1 w-full shrink-0 ${statusCfg.stripe}`} />

      {/* Pet header */}
      <div className="px-4 pt-4 pb-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl border border-border bg-muted/40 flex items-center justify-center shrink-0">
              <SpeciesIcon size={18} strokeWidth={1.75} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground text-[15px] leading-tight truncate">
                {appointment.pet?.name ?? '—'}
              </p>
              {appointment.pet?.species && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{appointment.pet.species.name}</p>
              )}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-border bg-muted/40 text-foreground/70">
                  <ServiceIcon size={9} strokeWidth={2.25} />{svc.label}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Date / time / owner */}
      <div className="px-4 py-3 border-b border-border/60 space-y-2">
        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-muted-foreground/60 shrink-0" />
          <span className="capitalize text-foreground text-xs">{dateStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-muted-foreground/60 shrink-0" />
          <span className="text-foreground font-medium tabular-nums text-xs">{timeStr}</span>
          {!isGrooming && appointment.duration_minutes && (
            <span className="text-muted-foreground text-xs">· {appointment.duration_minutes} min</span>
          )}
        </div>
        {appointment.owner && (
          <div className="flex items-center gap-2">
            <Phone size={12} className="text-muted-foreground/60 shrink-0" />
            <span className="font-medium text-foreground text-xs truncate">{appointment.owner.full_name}</span>
            {appointment.owner.phone && (
              <a
                href={`tel:${appointment.owner.phone}`}
                className="text-xs text-primary hover:underline tabular-nums ml-auto shrink-0"
              >
                {appointment.owner.phone}
              </a>
            )}
          </div>
        )}
        {appointment.reason && !isGrooming && (
          <p className="text-xs text-muted-foreground italic pl-[20px] line-clamp-2">"{appointment.reason}"</p>
        )}
        {isGrooming && appointment.reason && (
          <div className="pl-[20px] flex flex-wrap gap-1">
            {appointment.reason.split(', ').filter(Boolean).map(s => (
              <span key={s} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border bg-muted/40 text-foreground/70">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Service panel */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Panel
          appointment={appointment}
          onClose={onClose}
          onRefresh={() => { onRefresh(); router.refresh() }}
        />
      </div>
    </div>
  )
}
