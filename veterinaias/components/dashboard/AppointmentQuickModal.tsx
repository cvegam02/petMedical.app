'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { X, Clock, Calendar, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { DashboardAppointmentCard } from './DashboardAppointmentCard'
import type { DashboardAppointment } from './DashboardAppointmentCard'
export type { DashboardAppointment }

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  confirmed:  'Confirmada',
  completed:  'Completada',
  cancelled:  'Cancelada',
  no_show:    'No se presentó',
}

const ACTIVE_STATUSES = ['scheduled', 'confirmed']

interface Props {
  appointments: DashboardAppointment[]
}

export function AppointmentQuickModal({ appointments }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<DashboardAppointment | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selected) {
      modalRef.current?.focus()
    }
  }, [selected])

  async function transition(newStatus: string) {
    if (!selected) return
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/appointments/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      setSelected(null)
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  const isActive = selected ? ACTIVE_STATUSES.includes(selected.status) : false

  return (
    <>
      <div className="space-y-2">
        {appointments.map(apt => (
          <DashboardAppointmentCard key={apt.id} appointment={apt} onSelect={setSelected} />
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setSelected(null) }}
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de cita"
          tabIndex={-1}
        >
          <div ref={modalRef} tabIndex={-1} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Cita</p>
                <h2 className="text-lg font-semibold text-foreground mt-0.5">
                  {selected.pet?.name ?? '—'}
                  {selected.pet?.species && (
                    <span className="text-muted-foreground font-normal text-sm ml-2">{selected.pet.species.name}</span>
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Info */}
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar size={14} />
                <span className="capitalize">
                  {new Date(selected.scheduled_at).toLocaleDateString('es-MX', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={14} />
                <span>
                  {new Date(selected.scheduled_at).toLocaleTimeString('es-MX', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                  {' · '}{selected.duration_minutes} min
                </span>
              </div>
              {selected.owner && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">{selected.owner.full_name}</span>
                  {selected.owner.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone size={11} />
                      {selected.owner.phone}
                    </span>
                  )}
                </div>
              )}
              {selected.reason && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Motivo:</span> {selected.reason}
                </p>
              )}
              <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                {STATUS_LABELS[selected.status] ?? selected.status}
              </span>
            </div>

            {/* Actions */}
            {isActive ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={`/dashboard/pets/${selected.pet?.id}/records/new?appointmentId=${selected.id}`}
                  className={buttonVariants({ size: 'sm' })}
                >
                  Iniciar consulta
                </Link>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => transition('no_show')}
                    disabled={loading === 'no_show'}
                    className="flex-1"
                  >
                    {loading === 'no_show' ? '...' : 'No se presentó'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => transition('cancelled')}
                    disabled={loading === 'cancelled'}
                    className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    {loading === 'cancelled' ? '...' : 'Cancelar cita'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selected.status === 'completed' && 'Esta cita ya fue completada.'}
                {selected.status === 'cancelled' && 'Esta cita fue cancelada.'}
                {selected.status === 'no_show' && 'El paciente no se presentó.'}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
