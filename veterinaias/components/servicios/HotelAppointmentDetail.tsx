'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, BedDouble, Clock, Phone, Mail, User, Calendar, Info } from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { PetExpedienteModal } from '@/components/pets/PetExpedienteModal'
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

  const PetIcon = getSpeciesIcon(pet?.species?.name)

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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Navigation & Header */}
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
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="font-medium text-foreground">{owner?.full_name ?? '—'}</span>
              <span>•</span>
              <span className="capitalize">{dateStr}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Reservation info card */}
          <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Información de la reserva</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
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

                {checkOutStr && (
                  <div className="space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Salida esperada</p>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Calendar size={16} className="text-muted-foreground/40" />
                      <span className="capitalize">{checkOutStr}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="label-overline text-muted-foreground/50">Atendido por</p>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <User size={16} className="text-muted-foreground/40" />
                    <span>{assignedTo?.full_name ?? 'Sin asignar'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions area */}
            <div className="pt-8 border-t border-border/40">
              <p className="label-overline text-muted-foreground/50 mb-4">Acciones disponibles</p>

              {appointmentStatus === 'scheduled' && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={() => handleTransition('confirmed')} disabled={actionLoading !== null}>
                    {actionLoading === 'confirmed' ? 'Confirmando...' : 'Confirmar reserva'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTransition('no_show')}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'no_show' ? '...' : 'No se presentó'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTransition('cancelled')}
                    disabled={actionLoading !== null}
                    className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    {actionLoading === 'cancelled' ? 'Cancelando...' : 'Cancelar reserva'}
                  </Button>
                </div>
              )}

              {appointmentStatus === 'confirmed' && (
                <p className="text-sm text-muted-foreground">
                  Reserva confirmada — completa el check-in a continuación cuando llegue la mascota.
                </p>
              )}

              {(appointmentStatus === 'cancelled' || appointmentStatus === 'no_show') && (
                <p className="text-sm text-muted-foreground">
                  {appointmentStatus === 'cancelled'
                    ? 'Esta reserva fue cancelada.'
                    : 'El dueño no se presentó a esta reserva.'}
                </p>
              )}
            </div>
          </section>

        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Owner card */}
          <section className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="label-overline text-muted-foreground/50 font-mono">Responsable</p>
              {owner?.id && (
                <Link
                  href={`/dashboard/owners/${owner.id}`}
                  className="text-[10px] text-primary hover:underline font-bold uppercase tracking-tighter"
                >
                  Ver perfil
                </Link>
              )}
            </div>
            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground leading-tight">{owner?.full_name ?? '—'}</h4>
              <div className="space-y-2.5">
                {owner?.phone && (
                  <a href={`tel:${owner.phone}`} className="flex items-center gap-3 text-xs text-muted-foreground group">
                    <div className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Phone size={12} />
                    </div>
                    <span>{owner.phone}</span>
                  </a>
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

          {/* Pet card */}
          {pet && (
            <section className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="label-overline text-muted-foreground/50 font-mono">Paciente</p>
                <PetExpedienteModal
                  petId={pet.id}
                  petName={pet.name}
                  trigger={
                    <button className="text-[10px] text-primary hover:underline font-bold uppercase tracking-tighter cursor-pointer">
                      Ver expediente
                    </button>
                  }
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary/40">
                  <PetIcon size={24} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-foreground leading-none">{pet.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {pet.species?.name ?? 'Especie no definida'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Admin Metadata */}
          <div className="px-2 space-y-2">
            <Separator className="bg-border/40" />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/40 font-mono">
              <span>ID: {appointmentId.split('-')[0]}...</span>
            </div>
          </div>
        </div>
      </div>

      {appointmentStatus === 'confirmed' && (
        <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <BedDouble size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Registrar check-in
            </h3>
          </div>

          <div className="flex flex-col gap-4">
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

            <div className="space-y-1.5">
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

          <div className="flex gap-2 flex-wrap pt-2 border-t border-border/40">
            <Button size="sm" onClick={handleCheckIn} disabled={actionLoading !== null} className="gap-2">
              <BedDouble size={14} />
              {actionLoading === 'checkin' ? 'Registrando...' : 'Registrar check-in'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTransition('no_show')}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'no_show' ? '...' : 'No se presentó'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTransition('cancelled')}
              disabled={actionLoading !== null}
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              {actionLoading === 'cancelled' ? 'Cancelando...' : 'Cancelar reserva'}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
