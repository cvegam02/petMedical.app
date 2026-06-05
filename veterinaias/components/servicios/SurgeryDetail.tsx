'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ServiceLifecycleBar } from './ServiceLifecycleBar'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, Syringe, Save, Pill, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import type { Control } from 'react-hook-form'
import { concludeSurgerySchema, type ConcludeSurgeryValues } from '@/lib/validations/surgery'
import type { MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormSection } from '@/components/ui/form-section'
import { PrescriptionsFields } from '@/components/medical-records/PrescriptionsFields'
import { Checkbox } from '@/components/ui/checkbox'

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
  owner: { id: string; full_name: string } | null
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

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  )
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
  const displayDate = s.ended_at ?? s.started_at ?? s.scheduled_at

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <Link
        href="/dashboard/servicios/cirugia"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft size={14} />Cirugías
      </Link>

      {appointmentId && appointmentStatus && (
        <div className="mb-6">
          <ServiceLifecycleBar
            appointmentId={appointmentId}
            appointmentStatus={appointmentStatus}
            serviceType="surgery"
            serviceStartedAt={surgeryStartedAt ?? s?.started_at}
            onInitiate={handleIniciarCirugia}
          />
        </div>
      )}

      {/* Header card */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Cirugía</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {s.procedure || s.diagnosis || 'Cirugía'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {fmtDateTime(displayDate)}
              {s.attended_by_name ? ` · Dr. ${s.attended_by_name}` : ''}
            </p>
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
            isPending
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {isPending ? 'Pendiente' : 'Completada'}
          </span>
        </div>

        {/* Patient info */}
        {s.pet && (
          <div className="mb-5">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-2">Paciente</p>
            <p className="text-sm font-medium text-foreground">
              {s.pet.name}
              {s.pet.species?.name ? <span className="text-muted-foreground font-normal"> · {s.pet.species.name}</span> : null}
            </p>
            {s.owner && <p className="text-sm text-muted-foreground">{s.owner.full_name}</p>}
          </div>
        )}

        {/* Pre-op summary */}
        {(s.diagnosis || s.weight_kg || s.anesthesia_type) && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-2">Pre-operatorio</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {s.diagnosis && (
                <div>
                  <p className="text-xs text-muted-foreground">Diagnóstico / motivo</p>
                  <p className="text-sm text-foreground">{s.diagnosis}</p>
                </div>
              )}
              {s.weight_kg != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Peso</p>
                  <p className="text-sm text-foreground">{s.weight_kg} kg</p>
                </div>
              )}
              {s.anesthesia_type && (
                <div>
                  <p className="text-xs text-muted-foreground">Anestesia</p>
                  <p className="text-sm text-foreground">{s.anesthesia_type}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {s.pre_op_notes && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Notas pre-op</p>
            <p className="text-sm text-muted-foreground">{s.pre_op_notes}</p>
          </div>
        )}

        {s.anesthesia_notes && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Protocolo anestésico</p>
            <p className="text-sm text-muted-foreground">{s.anesthesia_notes}</p>
          </div>
        )}

        {/* Procedure + post-op (only when concluded) */}
        {!isPending && (
          <>
            {(s.procedure || s.findings || s.complications || s.supplies) && (
              <div className="mt-4 pt-4 border-t border-border/60">
                <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-3">Procedimiento</p>
                <div className="space-y-3">
                  <Field label="Procedimiento realizado" value={s.procedure} />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Hallazgos / técnica" value={s.findings} />
                    <Field label="Complicaciones" value={s.complications} />
                  </div>
                  <Field label="Insumos" value={s.supplies} />
                  {(s.started_at || s.ended_at) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Inicio</p>
                        <p className="text-sm text-foreground">{fmtDateTime(s.started_at)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Fin</p>
                        <p className="text-sm text-foreground">{fmtDateTime(s.ended_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(s.post_op_notes || s.recovery_instructions || s.follow_up_date) && (
              <div className="mt-4 pt-4 border-t border-border/60">
                <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-3">Post-operatorio</p>
                <div className="space-y-3">
                  <Field label="Notas post-op" value={s.post_op_notes} />
                  <Field label="Indicaciones de recuperación" value={s.recovery_instructions} />
                  <Field label="Próximo control" value={fmtDate(s.follow_up_date)} />
                </div>
              </div>
            )}

            {s.prescriptions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/60">
                <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-3">Recetas</p>
                <div className="space-y-2">
                  {s.prescriptions.map(p => (
                    <div key={p.id} className="bg-secondary rounded-lg p-3 text-sm border border-border">
                      <p className="font-medium text-foreground">{p.medication_name} — {p.dosage}</p>
                      <p className="text-muted-foreground">{p.frequency} por {p.duration}</p>
                      {p.notes && <p className="text-muted-foreground italic mt-0.5">{p.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Conclusion form — only when surgery is still pending */}
      {isPending && (
        <ConclusionForm visitId={s.id} onSuccess={load} />
      )}
    </div>
  )
}
