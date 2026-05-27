import Link from 'next/link'
import { ChevronRight, Clock, Phone } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled:  { label: 'Programada',      className: 'bg-muted text-muted-foreground border-border' },
  confirmed:  { label: 'Confirmada',      className: 'bg-primary/10 text-primary border-primary/20' },
  completed:  { label: 'Completada',      className: 'bg-primary/20 text-primary border-primary/30' },
  cancelled:  { label: 'Cancelada',       className: 'bg-destructive/10 text-destructive border-destructive/20' },
  no_show:    { label: 'No se presentó',  className: 'bg-orange-50 text-orange-600 border-orange-200' },
}

interface AppointmentCardProps {
  appointment: {
    id: string
    status: string
    scheduled_at: string
    duration_minutes: number
    reason: string | null
    pet: { id: string; name: string; species: { name: string } | null } | null
    owner: { id: string; full_name: string; phone: string | null } | null
    assigned_to_profile: { full_name: string } | null
  }
  showPhone?: boolean
}

export function AppointmentCard({ appointment, showPhone }: AppointmentCardProps) {
  const time = new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })
  const status = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.scheduled

  return (
    <Link
      href={`/dashboard/appointments/${appointment.id}`}
      className="group flex items-center gap-4 bg-card rounded-xl border border-border px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      {/* Time block */}
      <div className="flex flex-col items-center w-14 shrink-0">
        <span className="text-base font-semibold text-foreground leading-none">{time}</span>
        <span className="text-[11px] text-muted-foreground/60 mt-0.5 flex items-center gap-0.5">
          <Clock size={9} />
          {appointment.duration_minutes} min
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-border shrink-0" />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground leading-none">
            {appointment.pet?.name ?? '—'}
          </p>
          {appointment.pet?.species && (
            <span className="text-[11px] text-muted-foreground/60">
              {appointment.pet.species.name}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {appointment.owner?.full_name ?? '—'}
          {appointment.reason ? ` · ${appointment.reason}` : ''}
        </p>
        {showPhone && appointment.owner?.phone && (
          <p className="text-xs text-primary mt-1 flex items-center gap-1">
            <Phone size={10} />
            {appointment.owner.phone}
          </p>
        )}
      </div>

      {/* Status badge */}
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${status.className}`}>
        {status.label}
      </span>

      <ChevronRight
        size={15}
        className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0"
      />
    </Link>
  )
}
