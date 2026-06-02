'use client'

import Link from 'next/link'
import { Clock, Phone, ArrowRight } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import { serviceTypeConfig } from '@/lib/constants/service-type'
import type { ServiceType } from '@/lib/types/database'

export interface AppointmentResource {
  id: string
  status: string
  scheduled_at: string
  duration_minutes: number
  reason: string | null
  service_type?: ServiceType
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null } | null
}

export function AppointmentPopover({ appointment, children }: { appointment: AppointmentResource; children: React.ReactNode }) {
  const status = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
  const svc = serviceTypeConfig(appointment.service_type)
  const ServiceIcon = svc.Icon
  const isGrooming = (appointment.service_type ?? 'consultation') === 'grooming'

  const dateObj = new Date(appointment.scheduled_at)
  const time = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const date = dateObj.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <Popover>
      <PopoverTrigger
        render={<span className="w-full h-full flex items-center justify-center gap-1 px-1 overflow-hidden cursor-pointer" />}
        nativeButton={false}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-72 p-0 overflow-hidden rounded-xl border-border shadow-lg">
        {/* Accent bar by status */}
        <div className={`h-1 w-full ${status.stripe}`} />

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-[15px] text-foreground leading-tight truncate">
                {appointment.pet?.name ?? '—'}
              </p>
              {appointment.pet?.species && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{appointment.pet.species.name}</p>
              )}
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${status.className}`}>
              {status.label}
            </span>
          </div>

          {/* Service type — icon differentiates type (neutral, no color) */}
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-border bg-muted/40 text-foreground/70">
            <ServiceIcon size={12} strokeWidth={2} />
            {svc.label}
          </div>

          {/* Info rows */}
          <div className="space-y-1.5 pt-1 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-foreground/80">
              <Clock size={12} className="text-muted-foreground/60 shrink-0" />
              <span className="capitalize">{date} · {time}</span>
              {!isGrooming && (
                <span className="text-muted-foreground">· {appointment.duration_minutes} min</span>
              )}
            </div>
            {appointment.owner && (
              <div className="flex items-center gap-2 text-xs text-foreground/80">
                <Phone size={12} className="text-muted-foreground/60 shrink-0" />
                <span className="truncate">{appointment.owner.full_name}</span>
                {appointment.owner.phone && (
                  <a href={`tel:${appointment.owner.phone}`} className="text-primary hover:underline tabular-nums ml-auto shrink-0">
                    {appointment.owner.phone}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Reason / services */}
          {appointment.reason && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {isGrooming ? appointment.reason : `“${appointment.reason}”`}
            </p>
          )}

          {/* CTA */}
          <Link
            href={`/dashboard/appointments/${appointment.id}`}
            className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors rounded-lg py-2 mt-1"
          >
            Ver detalle
            <ArrowRight size={13} />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
