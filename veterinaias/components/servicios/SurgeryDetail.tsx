'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ServiceLifecycleBar } from './ServiceLifecycleBar'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChevronLeft, Syringe, Save, Pill, ClipboardList, Clock, Phone, User,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Control } from 'react-hook-form'
import { concludeSurgerySchema, type ConcludeSurgeryValues } from '@/lib/validations/surgery'
import type { MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { FormSection } from '@/components/ui/form-section'
import { PrescriptionsFields } from '@/components/medical-records/PrescriptionsFields'
import { Checkbox } from '@/components/ui/checkbox'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { PetExpedienteModal } from '@/components/pets/PetExpedienteModal'

interface Prescription {
  id: string
  medication_name: string
  dosage: string
  frequency: string
  duration: string
  route_of_administration: string | null
  notes: string | null
}

interface Surgery {
  id: string
  started_at: string | null
  ended_at: string | null
  scheduled_at: string | null
  status: string
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null } | null
  procedure: string | null
  diagnosis: string | null
  weight_kg: number | null
  pre_op_notes: string | null
  anesthesia_type: string | null
  anesthesia_notes: string | null
  findings: string | null
  complications: string | null
  supplies: string | null
  post_op_notes: string | null
  recovery_instructions: string | null
  follow_up_date: string | null
  attended_by_name: string | null
  prescriptions: Prescription[]
}

function fmtDateTime(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function nowLocalInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ConclusionForm({ visitId, onSuccess }: { visitId: string; onSuccess: () => void }) {
  const [startedAtLocal, setStartedAtLocal] = useState(nowLocalInput())
  const [endedAtLocal, setEndedAtLocal] = useState(nowLocalInput())

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } =
    useForm<ConcludeSurgeryValues>({
      resolver: zodResolver(concludeSurgerySchema) as any,
      defaultValues: { procedure: '', prescriptions: [] },
    })

  const router = useRouter()
  const [requiresHosp, setRequiresHosp] = useState(false)

  async function onSubmit(values: ConcludeSurgeryValues) {
    function toISO(s: string): string | undefined {
      const d = new Date(s)
      return isNaN(d.getTime()) ? undefined : d.toISOString()
    }
    const payload = {
      ...values,
      ...(startedAtLocal ? { started_at: toISO(startedAtLocal) } : {}),
      ...(endedAtLocal ? { ended_at: toISO(endedAtLocal) } : {}),
    }
    const res = await fetch(`/api/servicios/cirugia/${visitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al registrar'); return }
    toast.success('Cirugía registrada y concluida')
    if (requiresHosp) {
      router.push(`/dashboard/servicios/hospitalizacion?from=${visitId}`)
    } else {
      onSuccess()
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
        <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Registrar resultado</p>
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground mb-6">Conclusión de cirugía</h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-card border border-border shadow-xl shadow-primary/[0.01] rounded-2xl overflow-hidden divide-y divide-border/60">
          <FormSection title={
            <div className="flex items-center gap-2">
              <Syringe size={16} className="text-primary/60" />
              <span>Procedimiento</span>
            </div>
          }>
            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">
                  Procedimiento realizado <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register('procedure')}
                  placeholder="Nombre o descripción del procedimiento"
                  className="bg-muted/30 focus:bg-white transition-all"
                />
                {errors.procedure && (
                  <p className="text-destructive text-[11px] font-medium">{errors.procedure.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Hallazgos / técnica</Label>
                  <Textarea
                    {...register('findings')}
                    className="resize-none h-24 bg-muted/30 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Complicaciones</Label>
                  <Textarea
                    {...register('complications')}
                    placeholder="Ninguna / descripción"
                    className="resize-none h-24 bg-muted/30 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">Insumos (suturas, implantes)</Label>
                <Input {...register('supplies')} className="bg-muted/30 focus:bg-white transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Hora inicio</Label>
                  <input
                    type="datetime-local"
                    value={startedAtLocal}
                    onChange={e => setStartedAtLocal(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Hora fin</Label>
                  <input
                    type="datetime-local"
                    value={endedAtLocal}
                    onChange={e => setEndedAtLocal(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title={
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-primary/60" />
              <span>Post-operatorio</span>
            </div>
          }>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Notas post-operatorias</Label>
                  <Textarea
                    {...register('post_op_notes')}
                    className="resize-none h-20 bg-muted/30 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Indicaciones de recuperación (dueño)</Label>
                  <Textarea
                    {...register('recovery_instructions')}
                    className="resize-none h-20 bg-muted/30 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">Próximo control / retiro de puntos</Label>
                <Input
                  type="date"
                  {...register('follow_up_date')}
                  className="max-w-xs bg-muted/30 focus:bg-white transition-all"
                />
              </div>
            </div>
          </FormSection>

          <FormSection title={
            <div className="flex items-center gap-2">
              <Pill size={16} className="text-primary/60" />
              <span>Prescripción</span>
            </div>
          }>
            <PrescriptionsFields
              control={control as unknown as Control<MedicalRecordFormValues>}
              setValue={setValue as any}
            />
          </FormSection>

          <div className="px-6 py-4 flex items-center gap-3 border-t border-border/60">
            <Checkbox
              id="requires-hosp"
              checked={requiresHosp}
              onChange={e => setRequiresHosp((e.target as HTMLInputElement).checked)}
            />
            <label htmlFor="requires-hosp" className="text-sm font-medium cursor-pointer select-none">
              Requiere hospitalización post-quirúrgica
            </label>
          </div>

          <div className="px-8 py-5 bg-muted/20 flex items-center gap-4">
            <Button type="submit" size="lg" disabled={isSubmitting} className="shadow-md shadow-primary/20">
              {isSubmitting ? 'Guardando...' : (
                <>
                  <Save size={16} className="mr-2" />
                  Finalizar cirugía
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

interface Props {
  visitId: string
  appointmentId?: string | null
  appointmentStatus?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | null
  surgeryStartedAt?: string | null
}

export function SurgeryDetail({ visitId, appointmentId, appointmentStatus, surgeryStartedAt }: Props) {
  const [s, setS] = useState<Surgery | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  async function handleIniciarCirugia() {
    if (!visitId || visitId === appointmentId) {
      toast.info('Completa el formulario de conclusión para registrar la cirugía')
      return
    }
    try {
      const res = await fetch(`/api/servicios/cirugia/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ started_at: new Date().toISOString() }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error'); return }
      router.refresh()
    } catch { toast.error('Error de red') }
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/servicios/cirugia/${visitId}`)
      const json = await res.json()
      setS(res.ok ? json.data : null)
    } catch {
      setS(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [visitId])

  if (loading) return (
    <div className="max-w-4xl mx-auto pb-10">
      <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
    </div>
  )

  if (!s) return (
    <div className="max-w-4xl mx-auto pb-10">
      <Link href="/dashboard/servicios/cirugia" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft size={14} />Cirugías
      </Link>
      <div className="text-center py-16 mt-4 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
        <p className="text-sm font-medium text-foreground">Cirugía no encontrada</p>
      </div>
    </div>
  )

  const isPending = !s.ended_at
  const inQuirofano = !!s.started_at && !s.ended_at
  const displayDate = s.ended_at ?? s.started_at ?? s.scheduled_at
  const PetIcon = getSpeciesIcon(s.pet?.species?.name)

  const hasPreOp = !!(s.diagnosis || s.weight_kg != null || s.anesthesia_type || s.pre_op_notes || s.anesthesia_notes)
  const hasProcedure = !isPending && !!(s.procedure || s.findings || s.complications || s.supplies || s.started_at)
  const hasPostOp = !isPending && !!(s.post_op_notes || s.recovery_instructions || s.follow_up_date)

  const statusBadge = s.ended_at
    ? { label: 'Completada', className: 'text-green-700 bg-green-50 border-green-200' }
    : inQuirofano
      ? { label: 'En quirófano', className: 'text-amber-700 bg-amber-50 border-amber-200' }
      : appointmentStatus === 'cancelled'
        ? { label: 'Cancelada', className: 'text-muted-foreground bg-muted/40 border-border' }
        : appointmentStatus === 'confirmed'
          ? { label: 'Confirmada', className: 'text-primary bg-accent border-primary/20' }
          : { label: 'Programada', className: 'text-secondary-foreground bg-secondary border-secondary-foreground/20' }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard/servicios/cirugia"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a cirugías
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-[1.5px] bg-secondary-foreground/20 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-secondary-foreground uppercase tracking-[0.2em]">Detalle de cirugía</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {s.pet?.name ?? 'Paciente'}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              {s.owner && <span className="font-medium text-foreground">{s.owner.full_name}</span>}
              {s.owner && <span>•</span>}
              <span className="capitalize">{fmtDateTime(displayDate)}</span>
              {s.attended_by_name && <><span>•</span><span>Dr. {s.attended_by_name}</span></>}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider border ${statusBadge.className}`}
            >
              {inQuirofano && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1.5" />}
              {statusBadge.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Lifecycle bar */}
      {appointmentId && appointmentStatus && (
        <ServiceLifecycleBar
          appointmentId={appointmentId}
          appointmentStatus={appointmentStatus}
          serviceType="surgery"
          serviceStartedAt={surgeryStartedAt ?? s?.started_at}
          onInitiate={handleIniciarCirugia}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">

          {/* Pre-operatorio */}
          {hasPreOp && (
            <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <Syringe size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Pre-operatorio</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                {s.diagnosis && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Diagnóstico / motivo</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{s.diagnosis}</p>
                  </div>
                )}
                {s.weight_kg != null && (
                  <div className="space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Peso</p>
                    <p className="text-sm text-foreground">{s.weight_kg} kg</p>
                  </div>
                )}
                {s.anesthesia_type && (
                  <div className="space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Anestesia</p>
                    <p className="text-sm text-foreground">{s.anesthesia_type}</p>
                  </div>
                )}
                {s.anesthesia_notes && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Protocolo anestésico</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{s.anesthesia_notes}</p>
                  </div>
                )}
                {s.pre_op_notes && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Notas pre-op</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{s.pre_op_notes}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Procedimiento */}
          {hasProcedure && (
            <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <Syringe size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Procedimiento</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                {s.procedure && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Procedimiento realizado</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{s.procedure}</p>
                  </div>
                )}
                {s.findings && (
                  <div className="space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Hallazgos / técnica</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{s.findings}</p>
                  </div>
                )}
                {s.complications && (
                  <div className="space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Complicaciones</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{s.complications}</p>
                  </div>
                )}
                {s.supplies && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Insumos</p>
                    <p className="text-sm text-foreground">{s.supplies}</p>
                  </div>
                )}
                {(s.started_at || s.ended_at) && (
                  <>
                    <div className="space-y-1.5">
                      <p className="label-overline text-muted-foreground/50">Inicio</p>
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <Clock size={16} className="text-muted-foreground/40" />
                        <span>{fmtDateTime(s.started_at)}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="label-overline text-muted-foreground/50">Fin</p>
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <Clock size={16} className="text-muted-foreground/40" />
                        <span>{fmtDateTime(s.ended_at)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Post-operatorio */}
          {hasPostOp && (
            <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Post-operatorio</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                {s.post_op_notes && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Notas post-op</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{s.post_op_notes}</p>
                  </div>
                )}
                {s.recovery_instructions && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Indicaciones de recuperación</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{s.recovery_instructions}</p>
                  </div>
                )}
                {s.follow_up_date && (
                  <div className="space-y-1.5">
                    <p className="label-overline text-muted-foreground/50">Próximo control</p>
                    <p className="text-sm text-foreground">{fmtDate(s.follow_up_date)}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Prescripciones */}
          {!isPending && s.prescriptions.length > 0 && (
            <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <Pill size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Recetas</h3>
              </div>
              <div className="space-y-3">
                {s.prescriptions.map(p => (
                  <div key={p.id} className="bg-secondary rounded-xl p-4 text-sm border border-border">
                    <p className="font-medium text-foreground">{p.medication_name} — {p.dosage}</p>
                    <p className="text-muted-foreground mt-0.5">{p.frequency} por {p.duration}</p>
                    {p.route_of_administration && (
                      <p className="text-muted-foreground">Vía: {p.route_of_administration}</p>
                    )}
                    {p.notes && <p className="text-muted-foreground italic mt-0.5">{p.notes}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Conclusion form */}
          {isPending && <ConclusionForm visitId={s.id} onSuccess={load} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Owner card */}
          <section className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="label-overline text-muted-foreground/50 font-mono">Responsable</p>
              {s.owner?.id && (
                <Link
                  href={`/dashboard/owners/${s.owner.id}`}
                  className="text-[10px] text-primary hover:underline font-bold uppercase tracking-tighter"
                >
                  Ver perfil
                </Link>
              )}
            </div>
            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground leading-tight">
                {s.owner?.full_name ?? '—'}
              </h4>
              {s.owner?.phone && (
                <div className="space-y-2.5">
                  <a
                    href={`tel:${s.owner.phone}`}
                    className="flex items-center gap-3 text-xs text-muted-foreground group"
                  >
                    <div className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Phone size={12} />
                    </div>
                    <span>{s.owner.phone}</span>
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Pet card */}
          {s.pet && (
            <section className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="label-overline text-muted-foreground/50 font-mono">Paciente</p>
                <PetExpedienteModal
                  petId={s.pet.id}
                  petName={s.pet.name}
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
                  <h4 className="text-base font-bold text-foreground leading-none">{s.pet.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {s.pet.species?.name ?? 'Especie no definida'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Metadata */}
          <div className="px-2 space-y-2">
            <Separator className="bg-border/40" />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/40 font-mono">
              <span>ID: {s.id.split('-')[0]}...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
