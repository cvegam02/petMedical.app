'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, HeartPulse } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import type { PanelProps } from './index'

const ACTIVE_STATUSES = ['scheduled', 'confirmed']

export function ConsultationPanel({ appointment, onClose, onRefresh }: PanelProps) {
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null)
  const isActive = ACTIVE_STATUSES.includes(appointment.status)

  async function transition(newStatus: string) {
    setLoadingStatus(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      onClose()
      onRefresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setLoadingStatus(null)
    }
  }

  if (!isActive) {
    if (appointment.status === 'completed') {
      return (
        <div className="space-y-2">
          <p className="text-sm text-center text-muted-foreground py-1">Esta cita ya fue completada.</p>
          <Link
            href={`/dashboard/servicios/hospitalizacion?fromAppt=${appointment.id}`}
            className={`${buttonVariants({ variant: 'outline' })} w-full justify-center gap-2 text-sm`}
          >
            <HeartPulse size={14} />
            Hospitalizar paciente
          </Link>
        </div>
      )
    }
    return (
      <p className="text-sm text-center text-muted-foreground py-1">
        {appointment.status === 'cancelled' && 'Esta cita fue cancelada.'}
        {appointment.status === 'no_show' && 'El paciente no se presentó.'}
      </p>
    )
  }

  return (
    <>
      <Link
        href={`/dashboard/pets/${appointment.pet?.id}/records/new?appointmentId=${appointment.id}`}
        className={`${buttonVariants({})} w-full justify-center gap-2 py-3 text-base font-semibold`}
      >
        Iniciar consulta
        <ArrowRight size={16} />
      </Link>

      {appointment.status === 'scheduled' && (
        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => transition('confirmed')}
          disabled={loadingStatus === 'confirmed'}
        >
          {loadingStatus === 'confirmed' ? 'Confirmando…' : 'Confirmar cita'}
        </Button>
      )}

      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          type="button"
          onClick={() => transition('no_show')}
          disabled={loadingStatus === 'no_show'}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          {loadingStatus === 'no_show' ? 'Guardando…' : 'No se presentó'}
        </button>
        <span className="text-border text-xs">·</span>
        <button
          type="button"
          onClick={() => transition('cancelled')}
          disabled={loadingStatus === 'cancelled'}
          className="text-xs text-destructive/60 hover:text-destructive transition-colors disabled:opacity-40"
        >
          {loadingStatus === 'cancelled' ? 'Guardando…' : 'Cancelar cita'}
        </button>
      </div>
    </>
  )
}
