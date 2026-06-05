'use client'
import Link from 'next/link'
import { ChevronLeft, Phone, Mail } from 'lucide-react'
import { ServiceLifecycleBar } from './ServiceLifecycleBar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Appointment {
  id: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  scheduled_at: string
  duration_minutes: number | null
  reason: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null; email: string | null } | null
  assigned_to_profile: { id: string; full_name: string } | null
}

interface Props { appointment: Appointment }

export function ConsultaDetail({ appointment }: Props) {
  const scheduledDate = new Date(appointment.scheduled_at)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/dashboard/servicios/consulta"
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Consultas
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{appointment.pet?.name ?? 'Sin mascota'}</h1>
        <p className="text-sm text-muted-foreground">
          {appointment.pet?.species?.name} · {appointment.owner?.full_name}
        </p>
      </div>

      {/* Lifecycle bar */}
      <div className="mb-6">
        <ServiceLifecycleBar
          appointmentId={appointment.id}
          appointmentStatus={appointment.status}
          serviceType="consultation"
          petId={appointment.pet?.id}
        />
      </div>

      {/* Appointment info */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Fecha y hora
          </p>
          <p className="text-sm font-medium">
            {format(scheduledDate, "EEEE d 'de' MMMM, HH:mm", { locale: es })}
          </p>
        </div>

        {appointment.reason && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Motivo
            </p>
            <p className="text-sm">{appointment.reason}</p>
          </div>
        )}

        {appointment.assigned_to_profile && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Asignado a
            </p>
            <p className="text-sm">{appointment.assigned_to_profile.full_name}</p>
          </div>
        )}

        {appointment.owner && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Contacto del dueño
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {appointment.owner.phone && (
                <a
                  href={`tel:${appointment.owner.phone}`}
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {appointment.owner.phone}
                </a>
              )}
              {appointment.owner.email && (
                <a
                  href={`mailto:${appointment.owner.email}`}
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Mail className="h-3 w-3" />
                  {appointment.owner.email}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
