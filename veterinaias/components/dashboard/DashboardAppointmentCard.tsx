'use client'
import { Clock } from 'lucide-react'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'

export interface DashboardAppointment {
  id: string
  status: string
  scheduled_at: string
  duration_minutes: number
  reason: string | null
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

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment)}
      className="w-full group flex items-center gap-4 bg-card rounded-xl border border-border px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all text-left"
    >
      <div className="flex flex-col items-center w-16 shrink-0 border-r border-border pr-4">
        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase leading-none mb-1">{date}</span>
        <span className="text-base font-semibold text-foreground leading-none">{time}</span>
        <span className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-0.5">
          <Clock size={9} />
          {appointment.duration_minutes}m
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-none">
          {appointment.pet?.name ?? '—'}
          {appointment.pet?.species && (
            <span className="text-muted-foreground/60 font-normal ml-2 text-[11px]">
              {appointment.pet.species.name}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {appointment.owner?.full_name ?? '—'}
          {appointment.reason ? ` · ${appointment.reason}` : ''}
        </p>
      </div>
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${status.className}`}>
        {status.label}
      </span>
    </button>
  )
}
