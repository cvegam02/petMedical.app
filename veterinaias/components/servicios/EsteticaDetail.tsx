'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ServiceLifecycleBar } from './ServiceLifecycleBar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface GroomingService { id: string; service_name: string }
interface GroomingRecord {
  id: string
  intake_notes: string | null
  notes: string | null
  services: GroomingService[]
}
interface ServiceVisit {
  id: string
  status: string
  started_at: string | null
  ended_at: string | null
  grooming_record: GroomingRecord[] | GroomingRecord | null
}
interface Appointment {
  id: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  scheduled_at: string
  reason: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null } | null
  assigned_to_profile: { id: string; full_name: string } | null
  service_visit: ServiceVisit[] | ServiceVisit | null
}

interface Props { appointment: Appointment }

export function EsteticaDetail({ appointment }: Props) {
  const router = useRouter()
  const [concludeNotes, setConcludeNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Normalize service_visit (Supabase returns array for one-to-many)
  const visit: ServiceVisit | null = Array.isArray(appointment.service_visit)
    ? (appointment.service_visit[0] ?? null)
    : appointment.service_visit

  const record: GroomingRecord | null = visit
    ? (Array.isArray(visit.grooming_record) ? (visit.grooming_record[0] ?? null) : visit.grooming_record)
    : null

  const inProgress = visit !== null && visit.started_at !== null && visit.ended_at === null
  const isCompleted = visit !== null && visit.ended_at !== null

  async function handleInitiate() {
    if (!appointment.pet?.id) {
      toast.error('Mascota no encontrada')
      return
    }
    // session_date is required by groomingSessionSchema (YYYY-MM-DD)
    const sessionDate = appointment.scheduled_at.slice(0, 10)
    try {
      const res = await fetch('/api/servicios/estetica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointment.id,
          pet_id: appointment.pet.id,
          session_date: sessionDate,
          started_at: new Date().toISOString(),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al iniciar sesión'); return }
      toast.success('Sesión iniciada')
      router.refresh()
    } catch { toast.error('Error de red') }
  }

  async function handleConclude() {
    if (!visit?.id) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/servicios/estetica/${visit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ended_at: new Date().toISOString(),
          notes: concludeNotes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al concluir'); return }
      toast.success('Sesión concluida')
      router.refresh()
    } catch { toast.error('Error de red') } finally { setSubmitting(false) }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/dashboard/servicios/estetica"
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Estética
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{appointment.pet?.name ?? '—'}</h1>
        <p className="text-sm text-muted-foreground">
          {appointment.pet?.species?.name}
          {appointment.owner?.full_name ? ` · ${appointment.owner.full_name}` : ''}
        </p>
      </div>

      <div className="mb-6">
        <ServiceLifecycleBar
          appointmentId={appointment.id}
          appointmentStatus={appointment.status}
          serviceType="grooming"
          serviceStartedAt={visit?.started_at}
          onInitiate={handleInitiate}
        />
      </div>

      {/* Appointment info */}
      <div className="rounded-xl border bg-card p-5 space-y-3 mb-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Fecha</p>
          <p className="text-sm font-medium">
            {format(new Date(appointment.scheduled_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
          </p>
        </div>

        {appointment.assigned_to_profile && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Groomer</p>
            <p className="text-sm">{appointment.assigned_to_profile.full_name}</p>
          </div>
        )}

        {appointment.reason && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Motivo</p>
            <p className="text-sm">{appointment.reason}</p>
          </div>
        )}

        {appointment.owner?.phone && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Teléfono</p>
            <a
              href={`tel:${appointment.owner.phone}`}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <Phone className="h-3 w-3" />
              {appointment.owner.phone}
            </a>
          </div>
        )}

        {record?.intake_notes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notas de ingreso</p>
            <p className="text-sm">{record.intake_notes}</p>
          </div>
        )}

        {record?.services && record.services.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Servicios</p>
            <div className="flex flex-wrap gap-1">
              {record.services.map(s => (
                <span key={s.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {s.service_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Conclude form (only when in progress) */}
      {inProgress && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Concluir sesión</h2>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas finales</Label>
            <Textarea
              id="notes"
              value={concludeNotes}
              onChange={e => setConcludeNotes(e.target.value)}
              placeholder="Observaciones, recomendaciones..."
              className="resize-none"
            />
          </div>
          <Button onClick={handleConclude} disabled={submitting}>
            {submitting ? 'Guardando...' : 'Concluir sesión'}
          </Button>
        </div>
      )}

      {/* Completed session notes */}
      {isCompleted && record?.notes && (
        <div className="rounded-xl border bg-muted/30 p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Notas finales</p>
          <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
        </div>
      )}
    </div>
  )
}
