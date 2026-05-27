import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Clock, Calendar } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { StatusActions } from '@/components/appointments/StatusActions'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show:   'No se presentó',
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-muted text-muted-foreground border-border',
  confirmed: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-primary/20 text-primary border-primary/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show:   'bg-orange-50 text-orange-600 border-orange-200',
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>
}) {
  const { appointmentId } = await params
  const supabase = await createClient()

  const { data: appointment, error } = await (supabase.from('appointments') as any)
    .select(`
      id, status, scheduled_at, duration_minutes, reason, notes, created_at,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone, email),
      assigned_to_profile:assigned_to(id, full_name),
      created_by_profile:created_by(id, full_name),
      medical_record:medical_record_id(id)
    `)
    .eq('id', appointmentId)
    .single()

  if (error || !appointment) notFound()

  const pet = appointment.pet as any
  const owner = appointment.owner as any
  const assignedTo = appointment.assigned_to_profile as any
  const createdBy = appointment.created_by_profile as any
  const medicalRecord = appointment.medical_record as any

  const date = new Date(appointment.scheduled_at).toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const time = new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div>
      <Link
        href="/dashboard/appointments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft size={14} />
        Citas
      </Link>

      <div className="bg-card rounded-2xl border border-border p-6 mb-6 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-[1.5px] bg-primary/30 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Cita</p>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {pet?.name ?? '—'}
              {pet?.species ? <span className="text-muted-foreground font-normal text-base ml-2">{pet.species.name}</span> : null}
            </h1>
          </div>
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border shrink-0 ${STATUS_STYLES[appointment.status] ?? STATUS_STYLES.scheduled}`}>
            {STATUS_LABELS[appointment.status] ?? appointment.status}
          </span>
        </div>

        {/* Date/time */}
        <div className="flex flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar size={14} className="text-muted-foreground/50" />
            <span className="capitalize">{date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={14} className="text-muted-foreground/50" />
            {time} · {appointment.duration_minutes} min
          </div>
        </div>

        {/* People */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="label-overline text-muted-foreground/60 mb-1">Dueño</p>
            <Link
              href={`/dashboard/owners/${owner?.id}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {owner?.full_name ?? '—'}
            </Link>
            {owner?.phone && <p className="text-xs text-muted-foreground mt-0.5">{owner.phone}</p>}
          </div>
          <div>
            <p className="label-overline text-muted-foreground/60 mb-1">Mascota</p>
            <Link
              href={`/dashboard/pets/${pet?.id}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {pet?.name ?? '—'}
            </Link>
          </div>
          {assignedTo && (
            <div>
              <p className="label-overline text-muted-foreground/60 mb-1">Atendido por</p>
              <p className="text-sm text-foreground">{assignedTo.full_name}</p>
            </div>
          )}
          {createdBy && (
            <div>
              <p className="label-overline text-muted-foreground/60 mb-1">Creado por</p>
              <p className="text-sm text-muted-foreground">{createdBy.full_name}</p>
            </div>
          )}
        </div>

        {appointment.reason && (
          <div className="mb-4">
            <p className="label-overline text-muted-foreground/60 mb-1">Motivo</p>
            <p className="text-sm text-foreground">{appointment.reason}</p>
          </div>
        )}

        {appointment.notes && (
          <div className="mb-4">
            <p className="label-overline text-muted-foreground/60 mb-1">Notas</p>
            <p className="text-sm text-muted-foreground italic">{appointment.notes}</p>
          </div>
        )}

        {/* Linked medical record */}
        {medicalRecord && (
          <div className="mt-5 pt-5 border-t border-border">
            <p className="label-overline text-muted-foreground/60 mb-2">Consulta registrada</p>
            <Link
              href={`/dashboard/pets/${pet?.id}/records/${medicalRecord.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Ver registro clínico
            </Link>
          </div>
        )}
      </div>

      {/* Status actions */}
      <StatusActions
        appointmentId={appointmentId}
        petId={pet?.id ?? ''}
        status={appointment.status}
      />
    </div>
  )
}
