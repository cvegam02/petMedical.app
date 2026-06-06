'use client'
import { Clock } from 'lucide-react'
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
  assigned_to_profile?: { full_name: string } | null
  service_visits?: { id: string }[] | null
}

interface Props {
  appointment: DashboardAppointment
  onSelect: (apt: DashboardAppointment) => void
  variant?: 'today' | 'upcoming'
  isNext?: boolean
  dimmed?: boolean
  inService?: boolean
  overdue?: boolean
}

export function DashboardAppointmentCard({
  appointment, onSelect, variant = 'upcoming',
  isNext = false, dimmed = false, inService = false, overdue = false,
}: Props) {
  const dateObj = new Date(appointment.scheduled_at)
  const time = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const date = dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
  const status = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
  const svc = serviceTypeConfig(appointment.service_type)
  const isGrooming = (appointment.service_type ?? 'consultation') === 'grooming'
  const ServiceIcon = svc.Icon

  const borderClass = dimmed
    ? 'border-border/40 bg-muted/10 opacity-60 hover:opacity-80'
    : isNext
    ? 'border-primary/30 bg-primary/[0.03]'
    : overdue
    ? 'border-orange-300 bg-orange-50/40 hover:border-orange-400'
    : 'border-border bg-card hover:border-primary/40'

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment)}
      className={`w-full group flex items-stretch gap-0 rounded-xl border hover:shadow-sm transition-all text-left overflow-hidden ${borderClass}`}
    >
      <span className={`w-1 shrink-0 ${overdue && !dimmed ? 'bg-orange-400' : status.stripe} ${dimmed ? 'opacity-40' : ''}`} aria-hidden />

      <div className="flex items-center gap-4 px-5 py-4 flex-1 min-w-0">
        <div className="flex flex-col items-center w-16 shrink-0 border-r border-border pr-4">
          {variant === 'upcoming' && (
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase leading-none mb-1">{date}</span>
          )}
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
            <p className={`text-sm font-medium leading-none ${dimmed ? 'text-muted-foreground' : 'text-foreground'}`}>
              {appointment.pet?.name ?? '—'}
              {appointment.pet?.species && (
                <span className="text-muted-foreground/60 font-normal ml-2 text-[11px]">
                  {appointment.pet.species.name}
                </span>
              )}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-border bg-muted/40 text-foreground/70">
              <ServiceIcon size={10} strokeWidth={2.25} />
              {svc.label}
            </span>
            {inService && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                En servicio
              </span>
            )}
            {overdue && (
              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-orange-200 bg-orange-50 text-orange-600">
                Vencida
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 truncate">
            {appointment.owner?.full_name ?? '—'}
            {appointment.reason ? ` · ${appointment.reason}` : ''}
          </p>
        </div>
        {isNext ? (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground whitespace-nowrap shrink-0">
            Siguiente
          </span>
        ) : (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${status.className}`}>
            {status.label}
          </span>
        )}
      </div>
    </button>
  )
}
