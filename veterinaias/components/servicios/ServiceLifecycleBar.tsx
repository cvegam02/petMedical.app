'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
type ServiceType = 'consultation' | 'grooming' | 'boarding' | 'surgery'

interface ServiceLifecycleBarProps {
  appointmentId: string
  appointmentStatus: AppointmentStatus
  serviceType: ServiceType
  /** Set when service has actually started (service_visit.started_at or surgery.started_at) */
  serviceStartedAt?: string | null
  /** Called when the "Iniciar" button is clicked (for non-consultation services) */
  onInitiate?: () => void | Promise<void>
  /** Navigation target for "Iniciar consulta" — goes to records/new */
  petId?: string
}

const INITIATE_LABELS: Record<ServiceType, string> = {
  consultation: 'Iniciar consulta',
  grooming: 'Iniciar sesión',
  boarding: 'Check-in',
  surgery: 'Iniciar cirugía',
}

const CONCLUDE_LABELS: Record<ServiceType, string> = {
  consultation: 'Finalizar consulta',
  grooming: 'Concluir sesión',
  boarding: 'Check-out',
  surgery: 'Concluir cirugía',
}

export function ServiceLifecycleBar({
  appointmentId,
  appointmentStatus,
  serviceType,
  serviceStartedAt,
  onInitiate,
  petId,
}: ServiceLifecycleBarProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isInProgress = Boolean(serviceStartedAt)

  async function handleConfirm() {
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al confirmar'); return }
      router.refresh()
    } catch { toast.error('Error de red') } finally { setLoading(false) }
  }

  async function handleCancel(newStatus: 'cancelled' | 'no_show') {
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error'); return }
      router.refresh()
    } catch { toast.error('Error de red') } finally { setLoading(false) }
  }

  function handleInitiate() {
    if (serviceType === 'consultation' && petId) {
      router.push(`/dashboard/pets/${petId}/records/new?appointmentId=${appointmentId}`)
      return
    }
    if (onInitiate) onInitiate()
  }

  if (appointmentStatus === 'cancelled') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        <XCircle className="h-4 w-4 shrink-0" />
        Cita cancelada
      </div>
    )
  }

  if (appointmentStatus === 'no_show') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
        <XCircle className="h-4 w-4 shrink-0" />
        No se presentó
      </div>
    )
  }

  if (appointmentStatus === 'completed') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Servicio completado
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Timeline */}
        <StatusTimeline
          appointmentStatus={appointmentStatus}
          serviceType={serviceType}
          serviceStartedAt={serviceStartedAt}
        />

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {appointmentStatus === 'scheduled' && (
            <>
              <Button size="sm" onClick={handleConfirm} disabled={loading}>
                Confirmar cita
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCancel('cancelled')}
                disabled={loading}
                className="text-red-600 hover:bg-red-50"
              >
                Cancelar
              </Button>
            </>
          )}

          {appointmentStatus === 'confirmed' && !isInProgress && (
            <>
              <Button size="sm" onClick={handleInitiate} disabled={loading}>
                {INITIATE_LABELS[serviceType]}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCancel('no_show')}
                disabled={loading}
              >
                No se presentó
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCancel('cancelled')}
                disabled={loading}
                className="text-red-600 hover:bg-red-50"
              >
                Cancelar
              </Button>
            </>
          )}

          {/* For in-progress non-consultation services, the conclude action is in the detail body */}
          {appointmentStatus === 'confirmed' && isInProgress && serviceType !== 'consultation' && (
            <p className="text-sm text-muted-foreground">
              En curso — usa el formulario abajo para {CONCLUDE_LABELS[serviceType].toLowerCase()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusTimeline({
  appointmentStatus,
  serviceType,
  serviceStartedAt,
}: {
  appointmentStatus: AppointmentStatus
  serviceType: ServiceType
  serviceStartedAt?: string | null
}) {
  const steps = [
    { key: 'scheduled', label: 'Agendado' },
    { key: 'confirmed', label: 'Confirmado' },
    { key: 'in_progress', label: serviceType === 'boarding' ? 'Check-in' : 'En curso' },
    { key: 'completed', label: serviceType === 'boarding' ? 'Check-out' : 'Completado' },
  ]

  function getStepState(stepKey: string): 'done' | 'current' | 'pending' {
    if (stepKey === 'scheduled') {
      return appointmentStatus !== 'scheduled' ? 'done' : 'current'
    }
    if (stepKey === 'confirmed') {
      if (['confirmed', 'completed'].includes(appointmentStatus) || serviceStartedAt) return 'done'
      if (appointmentStatus === 'confirmed' && !serviceStartedAt) return 'current'
      return 'pending'
    }
    if (stepKey === 'in_progress') {
      if (appointmentStatus === 'completed') return 'done'
      if (serviceStartedAt) return 'current'
      return 'pending'
    }
    if (stepKey === 'completed') {
      return appointmentStatus === 'completed' ? 'done' : 'pending'
    }
    return 'pending'
  }

  return (
    <div className="flex items-center gap-1 text-xs flex-wrap">
      {steps.map((step, i) => {
        const state = getStepState(step.key)
        return (
          <span key={step.key} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <span
              className={
                state === 'done'
                  ? 'text-green-600 font-medium'
                  : state === 'current'
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground'
              }
            >
              {state === 'done' && <CheckCircle2 className="inline h-3 w-3 mr-0.5" />}
              {step.label}
            </span>
          </span>
        )
      })}
    </div>
  )
}
