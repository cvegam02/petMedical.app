'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'

interface StatusActionsProps {
  appointmentId: string
  petId: string
  status: string
  serviceType?: 'consultation' | 'grooming'
}

export function StatusActions({ appointmentId, petId, status, serviceType = 'consultation' }: StatusActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function transition(newStatus: string) {
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
    setLoading(null)
  }
}

  if (status === 'scheduled') {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={() => transition('confirmed')}
          disabled={loading === 'confirmed'}
        >
          {loading === 'confirmed' ? 'Confirmando...' : 'Confirmar cita'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => transition('cancelled')}
          disabled={loading === 'cancelled'}
          className="text-destructive border-destructive/30 hover:bg-destructive/5"
        >
          {loading === 'cancelled' ? 'Cancelando...' : 'Cancelar cita'}
        </Button>
      </div>
    )
  }

  if (status === 'confirmed') {
    return (
      <div className="flex gap-2 flex-wrap">
        <Link
          href={`/dashboard/pets/${petId}/records/new?appointmentId=${appointmentId}`}
          className={buttonVariants({ size: 'sm' })}
        >
          {serviceType === 'grooming' ? 'Registrar sesión' : 'Registrar consulta'}
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => transition('no_show')}
          disabled={loading === 'no_show'}
        >
          {loading === 'no_show' ? '...' : 'No se presentó'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => transition('cancelled')}
          disabled={loading === 'cancelled'}
          className="text-destructive border-destructive/30 hover:bg-destructive/5"
        >
          {loading === 'cancelled' ? 'Cancelando...' : 'Cancelar cita'}
        </Button>
      </div>
    )
  }

  // Terminal states
  const messages: Record<string, string> = {
    completed: 'Esta cita fue completada y tiene un registro clínico asociado.',
    cancelled:  'Esta cita fue cancelada.',
    no_show:    'El dueño no se presentó a esta cita.',
  }
  return (
    <p className="text-sm text-muted-foreground">{messages[status] ?? ''}</p>
  )
}
