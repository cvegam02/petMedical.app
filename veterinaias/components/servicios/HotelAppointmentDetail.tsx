'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, BedDouble, Clock, Phone, User, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'

interface Props {
  appointmentId: string
  appointmentStatus: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  appointmentExpectedCheckOut: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null; email: string | null } | null
  assignedTo: { id: string; full_name: string } | null
  scheduledAt: string
}

export function HotelAppointmentDetail({
  appointmentId,
  appointmentStatus,
  appointmentExpectedCheckOut,
  pet,
  owner,
  assignedTo,
  scheduledAt,
}: Props) {
  const router = useRouter()
  const [feeding, setFeeding] = useState('')
  const [belongings, setBelongings] = useState('')
  const [specialCare, setSpecialCare] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const statusCfg = APPOINTMENT_STATUS_CONFIG[appointmentStatus] ?? APPOINTMENT_STATUS_CONFIG.scheduled

  const dateObj = new Date(scheduledAt)
  const dateStr = dateObj.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  const checkOutStr = appointmentExpectedCheckOut
    ? new Date(appointmentExpectedCheckOut).toLocaleDateString('es-MX', {
        weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  async function handleTransition(newStatus: string) {
    setActionLoading(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      router.refresh()
    } catch { toast.error('Error de red') } finally { setActionLoading(null) }
  }

  async function handleCheckIn() {
    setActionLoading('checkin')
    try {
      const res = await fetch('/api/servicios/hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointmentId,
          pet_id: pet?.id,
          ...(feeding.trim() ? { feeding_instructions: feeding.trim() } : {}),
          ...(belongings.trim() ? { belongings: belongings.trim() } : {}),
          ...(specialCare.trim() ? { special_care: specialCare.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al hacer check-in'); return }
      toast.success('Check-in registrado')
      const newVisitId = json.data?.id
      if (newVisitId) {
        router.push(`/dashboard/servicios/hotel/stay/${newVisitId}`)
      } else {
        router.refresh()
      }
    } catch { toast.error('Error de red') } finally { setActionLoading(null) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard/servicios/hotel"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver al hotel
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-[1.5px] bg-secondary-foreground/20 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-secondary-foreground uppercase tracking-[0.2em]">
                Reserva de hotel
              </p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {pet?.name ?? '—'}
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{owner?.full_name ?? '—'}</span>
            </p>
          </div>

          <div>
            <Badge
              variant="outline"
              className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider border ${statusCfg.className}`}
            >
              {statusCfg.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Appointment info card */}
      <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Información de la reserva
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
          {/* Check-in date */}
          <div className="space-y-1.5">
            <p className="label-overline text-muted-foreground/50">Fecha de entrada</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Calendar size={16} className="text-muted-foreground/40" />
                <span className="capitalize">{dateStr}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock size={14} className="text-muted-foreground/40" />
                <span>{timeStr}</span>
              </div>
            </div>
          </div>

          {/* Expected check-out */}
          {checkOutStr && (
            <div className="space-y-1.5">
              <p className="label-overline text-muted-foreground/50">Salida esperada</p>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Calendar size={16} className="text-muted-foreground/40" />
                <span className="capitalize">{checkOutStr}</span>
              </div>
            </div>
          )}

          {/* Owner contact */}
          <div className="space-y-1.5">
            <p className="label-overline text-muted-foreground/50">Responsable</p>
            <div className="flex items-center gap-2 text-foreground font-medium">
              <User size={16} className="text-muted-foreground/40" />
              <span>{owner?.full_name ?? '—'}</span>
            </div>
            {owner?.phone && (
              <a
                href={`tel:${owner.phone}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone size={14} className="text-muted-foreground/40" />
                <span>{owner.phone}</span>
              </a>
            )}
          </div>

          {/* Assigned to */}
          <div className="space-y-1.5">
            <p className="label-overline text-muted-foreground/50">Atendido por</p>
            <div className="flex items-center gap-2 text-foreground font-medium">
              <User size={16} className="text-muted-foreground/40" />
              <span>{assignedTo?.full_name ?? 'Sin asignar'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Actions by status */}
      {appointmentStatus === 'scheduled' && (
        <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">
            La reserva está programada. Confirma la asistencia del dueño antes del check-in.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleTransition('confirmed')}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'confirmed' ? 'Confirmando...' : 'Confirmar reserva'}
            </Button>
            <button
              onClick={() => handleTransition('no_show')}
              disabled={actionLoading !== null}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              No se presentó
            </button>
            <button
              onClick={() => handleTransition('cancelled')}
              disabled={actionLoading !== null}
              className="text-xs text-destructive/70 hover:text-destructive underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      {appointmentStatus === 'confirmed' && (
        <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <BedDouble size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Registrar check-in
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="feeding">Instrucciones de alimentación</Label>
              <Textarea
                id="feeding"
                value={feeding}
                onChange={e => setFeeding(e.target.value)}
                placeholder="Frecuencia, cantidad, tipo de alimento..."
                className="resize-none h-24 bg-muted/30 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="belongings">Pertenencias</Label>
              <Textarea
                id="belongings"
                value={belongings}
                onChange={e => setBelongings(e.target.value)}
                placeholder="Cobija, juguetes, correa, portacomidas..."
                className="resize-none h-24 bg-muted/30 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="specialCare">Cuidados especiales / medicación</Label>
              <Textarea
                id="specialCare"
                value={specialCare}
                onChange={e => setSpecialCare(e.target.value)}
                placeholder="Medicamentos, alergias, condiciones especiales..."
                className="resize-none h-24 bg-muted/30 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/40">
            <Button
              onClick={handleCheckIn}
              disabled={actionLoading !== null}
              className="gap-2"
            >
              <BedDouble size={14} />
              {actionLoading === 'checkin' ? 'Registrando...' : 'Registrar check-in'}
            </Button>
            <button
              onClick={() => handleTransition('no_show')}
              disabled={actionLoading !== null}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              No se presentó
            </button>
            <button
              onClick={() => handleTransition('cancelled')}
              disabled={actionLoading !== null}
              className="text-xs text-destructive/70 hover:text-destructive underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              Cancelar reserva
            </button>
          </div>
        </section>
      )}

      {(appointmentStatus === 'cancelled' || appointmentStatus === 'no_show') && (
        <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm">
          <p className="text-sm text-muted-foreground">
            {appointmentStatus === 'cancelled'
              ? 'Esta reserva fue cancelada.'
              : 'El dueño no se presentó a esta reserva.'}
          </p>
        </section>
      )}
    </div>
  )
}
