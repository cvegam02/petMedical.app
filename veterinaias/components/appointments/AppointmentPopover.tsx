'use client'

import Link from 'next/link'
import { Clock } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'

export interface AppointmentResource {
  id: string
  status: string
  scheduled_at: string
  duration_minutes: number
  reason: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null } | null
}

interface AppointmentPopoverProps {
  appointment: AppointmentResource
  children: React.ReactNode
}

export function AppointmentPopover({ appointment, children }: AppointmentPopoverProps) {
  const status = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
  const dateObj = new Date(appointment.scheduled_at)
  const time = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const date = dateObj.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <Popover>
      <PopoverTrigger
        render={<span className="w-full h-full flex items-center gap-1 px-1 overflow-hidden cursor-pointer" />}
        nativeButton={false}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm text-foreground leading-none">
                {appointment.pet?.name ?? '—'}
              </p>
              {appointment.pet?.species && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {appointment.pet.species.name}
                </p>
              )}
            </div>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${status.className}`}>
              {status.label}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {appointment.owner?.full_name ?? '—'}
          </p>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={11} />
            <span className="capitalize">{date} · {time} · {appointment.duration_minutes}min</span>
          </div>

          {appointment.reason && (
            <p className="text-xs text-muted-foreground italic">{appointment.reason}</p>
          )}

          <Link
            href={`/dashboard/appointments/${appointment.id}`}
            className="block w-full text-center text-xs font-medium text-primary hover:underline pt-1 border-t border-border mt-1"
          >
            Ver detalle →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
