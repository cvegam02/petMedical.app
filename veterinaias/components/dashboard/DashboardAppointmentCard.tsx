'use client'
import { Clock, Stethoscope, Scissors } from 'lucide-react'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import { serviceTypeConfig } from '@/lib/constants/service-type'
import type { ServiceType } from '@/lib/types/database'

export interface DashboardAppointment {
  id: string
  status: string
  scheduled_at: string
  duration_minutes: number
  reason: string | null
  service_type?: ServiceType
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null } | null
  assigned_to_profile: { full_name: string } | null
}

interface Props {
  appointment: DashboardAppointment
  onSelect: (apt: DashboardAppointment) => void
}

export function DashboardAppointmentCard({ appointment, onSelect }: Props) {
  const dateObj = new Date(appointment.scheduled_at)
  const time = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const date = dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
  const status = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
  const svc = serviceTypeConfig(appointment.service_type)
  const isGrooming = (appointment.service_type ?? 'consultation') === 'grooming'
  const ServiceIcon = isGrooming ? Scissors : Stethoscope

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment)}
      className="w-full group flex items-stretch gap-0 bg-card rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all text-left overflow-hidden"
    >
      {/* Service-type accent bar */}
      <span className={`w-1 shrink-0 ${svc.bar}`} aria-hidden />

      <div className="flex items-center gap-4 px-5 py-4 flex-1 min-w-0">
        <div className="flex flex-col items-center w-16 shrink-0 border-r border-border pr-4">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase leading-none mb-1">{date}</span>
          <span className="text-base font-semibold text-foreground leading-none">{time}</span>
          {!isGrooming && (
            <span className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-0.5">
              <Clock size={9} />
              {appointment.duration_minutes}m
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground leading-none">
              {appointment.pet?.name ?? '—'}
              {appointment.pet?.species && (
                <span className="text-muted-foreground/60 font-normal ml-2 text-[11px]">
                  {appointment.pet.species.name}
                </span>
              )}
            </p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${svc.chip}`}>
              <ServiceIcon size={10} strokeWidth={2.25} />
              {svc.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 truncate">
            {appointment.owner?.full_name ?? '—'}
            {appointment.reason ? ` · ${appointment.reason}` : ''}
          </p>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${status.className}`}>
          {status.label}
        </span>
      </div>
    </button>
  )
}
