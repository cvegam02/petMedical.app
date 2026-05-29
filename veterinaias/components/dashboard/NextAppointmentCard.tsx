import Link from 'next/link'
import { Clock, Calendar, ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import type { DashboardAppointment } from './DashboardAppointmentCard'

interface Props {
  appointment: DashboardAppointment
  onSelect?: (apt: DashboardAppointment) => void
}

export function NextAppointmentCard({ appointment, onSelect }: Props) {
  const time = new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })
  const date = new Date(appointment.scheduled_at).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => onSelect?.(appointment)}
        className="w-full text-left rounded-2xl border border-primary/20 bg-primary/5 p-5 transition-all hover:border-primary/40 hover:shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">
              Siguiente consulta
            </p>
            <h2 className="text-xl font-bold font-heading text-foreground">
              {appointment.pet?.name ?? '—'}
              {appointment.pet?.species && (
                <span className="text-muted-foreground font-normal text-base ml-2">
                  {appointment.pet.species.name}
                </span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">{appointment.owner?.full_name ?? '—'}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                <span className="capitalize">{date}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {time} · {appointment.duration_minutes} min
              </span>
            </div>
            {appointment.reason && (
              <p className="text-xs text-muted-foreground">Motivo: {appointment.reason}</p>
            )}
          </div>
          <div className="invisible sm:visible">
            <ArrowRight size={20} className="text-primary/40 group-hover:text-primary transition-colors mt-2" />
          </div>
        </div>
      </button>

      <div className="absolute top-5 right-5 hidden sm:block">
        <Link
          href={`/dashboard/pets/${appointment.pet?.id}/records/new?appointmentId=${appointment.id}`}
          className={buttonVariants({ size: 'sm' })}
          onClick={(e) => e.stopPropagation()}
        >
          Iniciar consulta
          <ArrowRight size={14} />
        </Link>
      </div>
      
    </div>
  )
}
