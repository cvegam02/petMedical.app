'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import type { PanelProps } from './index'

const ACTIVE_STATUSES = ['scheduled', 'confirmed']

interface SurgeryStub {
  id: string
  ended_at: string | null
  diagnosis: string | null
}

export function SurgeryPanel({ appointment, onClose, onRefresh }: PanelProps) {
  const [loading, setLoading] = useState(false)
  const [surgery, setSurgery] = useState<SurgeryStub | null>(null)
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null)
  const isActive = ACTIVE_STATUSES.includes(appointment.status)

  useEffect(() => {
    setLoading(true)
    setSurgery(null)
    fetch(`/api/servicios/cirugia?appointmentId=${appointment.id}`)
      .then(r => r.json())
      .then(json => setSurgery(json.data ?? null))
      .catch(() => setSurgery(null))
      .finally(() => setLoading(false))
  }, [appointment.id])

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

  if (loading) return <p className="text-sm text-center text-muted-foreground py-1">Cargando…</p>

  if (surgery?.ended_at || appointment.status === 'completed') {
    return (
      <div className="space-y-2">
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">Cirugía completada</p>
        </div>
        {surgery?.id && (
          <Link
            href={`/dashboard/servicios/cirugia/${surgery.id}`}
            className={`${buttonVariants({ variant: 'outline' })} w-full justify-center gap-2`}
          >
            Ver registro <ArrowRight size={14} />
          </Link>
        )}
      </div>
    )
  }

  if (!isActive) {
    return (
      <p className="text-sm text-center text-muted-foreground py-1">
        {appointment.status === 'cancelled' && 'Esta cirugía fue cancelada.'}
        {appointment.status === 'no_show' && 'El paciente no se presentó.'}
      </p>
    )
  }

  return (
    <>
      {surgery?.id ? (
        <Link
          href={`/dashboard/servicios/cirugia/${surgery.id}`}
          className={`${buttonVariants({})} w-full justify-center gap-2 py-3 text-base font-semibold`}
        >
          Detalles de cirugía
          <ArrowRight size={16} />
        </Link>
      ) : (
        <p className="text-sm text-center text-muted-foreground py-4">
          Sin datos. Agenda esta cirugía desde la página de Cirugías.
        </p>
      )}

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
