import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Clock, User, Info, FileText, Phone, Mail, PawPrint } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { StatusActions } from '@/components/appointments/StatusActions'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PetExpedienteModal } from '@/components/pets/PetExpedienteModal'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'

export default async function ConsultaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: appointment, error } = await (supabase.from('appointments') as any)
    .select(`
      id, status, scheduled_at, duration_minutes, reason, notes, created_at, service_type,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone, email),
      assigned_to_profile:assigned_to(id, full_name),
      created_by_profile:created_by(id, full_name)
    `)
    .eq('id', id)
    .eq('service_type', 'consultation')
    .single()

  if (error || !appointment) notFound()

  const pet = appointment.pet as any
  const owner = appointment.owner as any
  const assignedTo = appointment.assigned_to_profile as any
  const createdBy = appointment.created_by_profile as any

  const dateObj = new Date(appointment.scheduled_at)
  const dateStr = dateObj.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = dateObj.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })

  const status = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard/servicios/consulta"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a consultas
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-[1.5px] bg-secondary-foreground/20 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-secondary-foreground uppercase tracking-[0.2em]">Detalle de consulta</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {pet?.name ?? '—'}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="font-medium text-foreground">{owner?.full_name ?? '—'}</span>
              <span>•</span>
              <span className="capitalize">{dateStr}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider border ${status.className}`}>
              {status.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Información de la cita</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                <div className="space-y-1.5">
                  <p className="label-overline text-muted-foreground/50">Horario programado</p>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Clock size={16} className="text-muted-foreground/40" />
                    <span>{timeStr} <span className="text-muted-foreground font-normal">({appointment.duration_minutes} min)</span></span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="label-overline text-muted-foreground/50">Especialista asignado</p>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <User size={16} className="text-muted-foreground/40" />
                    <span>{assignedTo?.full_name ?? 'Pendiente de asignar'}</span>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <p className="label-overline text-muted-foreground/50">Motivo de consulta</p>
                  <div className="flex items-start gap-2 p-4 rounded-xl bg-muted/30 border border-border/40">
                    <FileText size={16} className="text-muted-foreground/40 mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed italic">
                      {appointment.reason ? `"${appointment.reason}"` : 'No se especificó motivo.'}
                    </p>
                  </div>
                </div>

                {appointment.notes && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Observaciones adicionales</p>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {appointment.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Area */}
            <div className="pt-8 border-t border-border/40">
              <p className="label-overline text-muted-foreground/50 mb-4">Acciones disponibles</p>
              <StatusActions
                appointmentId={id}
                petId={pet?.id ?? ''}
                status={appointment.status}
                serviceType={appointment.service_type}
              />
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Owner Quick Card */}
          <section className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="label-overline text-muted-foreground/50 font-mono">Responsable</p>
              <Link href={`/dashboard/owners/${owner?.id}`} className="text-[10px] text-primary hover:underline font-bold uppercase tracking-tighter">
                Ver perfil
              </Link>
            </div>

            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground leading-tight">{owner?.full_name}</h4>

              <div className="space-y-2.5">
                {owner?.phone && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground group">
                    <div className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Phone size={12} />
                    </div>
                    <span>{owner.phone}</span>
                  </div>
                )}
                {owner?.email && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground group">
                    <div className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Mail size={12} />
                    </div>
                    <span className="truncate">{owner.email}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Pet Quick Card */}
          <section className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="label-overline text-muted-foreground/50 font-mono">Paciente</p>
              <PetExpedienteModal
                petId={pet?.id ?? ''}
                petName={pet?.name ?? ''}
                trigger={
                  <button className="text-[10px] text-primary hover:underline font-bold uppercase tracking-tighter cursor-pointer">
                    Ver expediente
                  </button>
                }
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary/40">
                <PawPrint size={24} />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-bold text-foreground leading-none">{pet?.name}</h4>
                <p className="text-xs text-muted-foreground mt-1.5">{pet?.species?.name ?? 'Especie no definida'}</p>
              </div>
            </div>
          </section>

          {/* Admin Metadata */}
          <div className="px-2 space-y-2">
            <Separator className="bg-border/40" />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/40 font-mono">
              <span>ID: {appointment.id.split('-')[0]}...</span>
              <span>Creado por: {createdBy?.full_name?.split(' ')[0] ?? 'Sistema'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
