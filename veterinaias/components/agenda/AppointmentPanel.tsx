'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AgendaAppointment } from './DayView'

interface AppointmentPanelProps {
  appointment: AgendaAppointment
  onClose: () => void
}

const SERVICE_LABELS: Record<AgendaAppointment['service_type'], string> = {
  consultation: 'Consulta',
  grooming: 'Estética',
  boarding: 'Hotel',
  surgery: 'Cirugía',
}

const STATUS_LABELS: Record<AgendaAppointment['status'], string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  no_show: 'No se presentó',
}

const DETAIL_ROUTES: Record<AgendaAppointment['service_type'], string> = {
  consultation: 'consulta',
  grooming: 'estetica',
  boarding: 'hotel',
  surgery: 'cirugia',
}

export function AppointmentPanel({ appointment, onClose }: AppointmentPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const detailRoute = DETAIL_ROUTES[appointment.service_type]

  async function transition(newStatus: string) {
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error'); return }
      router.refresh()
      onClose()
  } catch {
    toast.error('Error de red, intenta de nuevo')
  } finally {
    setLoading(null)
  }
}

  const canConfirm = appointment.status === 'scheduled'
  const canCancel = ['scheduled', 'confirmed'].includes(appointment.status)
  const canNoShow = appointment.status === 'confirmed'

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold">{appointment.pet?.name ?? '—'}</p>
          <p className="text-sm text-muted-foreground">{appointment.owner?.full_name}</p>
        </div>
        <button
          type="button"
          aria-label="Cerrar panel"
          onClick={onClose}
          className="rounded p-1 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <Badge variant="outline">{SERVICE_LABELS[appointment.service_type]}</Badge>
        <Badge variant="outline">{STATUS_LABELS[appointment.status]}</Badge>
      </div>

      {/* Quick actions — pre-initiation only */}
      <div className="flex flex-col gap-2">
        {canConfirm && (
          <Button size="sm" onClick={() => transition('confirmed')} disabled={loading !== null}>
            Confirmar cita
          </Button>
        )}
        {canNoShow && (
          <Button size="sm" variant="outline" onClick={() => transition('no_show')} disabled={loading !== null}>
            No se presentó
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="outline" onClick={() => transition('cancelled')} disabled={loading !== null}
            className="text-red-600 hover:bg-red-50">
            Cancelar
          </Button>
        )}
      </div>

      {/* Primary navigation */}
      {detailRoute && (
        <Link
          href={`/dashboard/servicios/${detailRoute}/${appointment.id}`}
          className="mt-auto flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" />
          Ver detalle
        </Link>
      )}
    </div>
  )
}
