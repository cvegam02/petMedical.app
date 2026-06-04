'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Syringe, CheckCircle2, ClipboardList, Pill } from 'lucide-react'
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
import type { PanelProps } from './index'

const ACTIVE_STATUSES = ['scheduled', 'confirmed']

interface SurgeryStub {
  id: string
  ended_at: string | null
  procedure: string | null
  diagnosis: string | null
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

  async function onSubmit(values: ConcludeSurgeryValues) {
    const payload = {
      ...values,
      ...(startedAtLocal ? { started_at: new Date(startedAtLocal).toISOString() } : {}),
      ...(endedAtLocal ? { ended_at: new Date(endedAtLocal).toISOString() } : {}),
    }
    const res = await fetch(`/api/servicios/cirugia/${visitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al registrar'); return }
    toast.success('Cirugía registrada y concluida')
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormSection title={
        <div className="flex items-center gap-2">
          <Syringe size={14} className="text-primary/60" />
          <span>Procedimiento</span>
        </div>
      }>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">
              Procedimiento <span className="text-destructive">*</span>
            </Label>
            <Input
              {...register('procedure')}
              placeholder="Nombre / descripción"
              className="bg-muted/30 focus:bg-white transition-all"
            />
            {errors.procedure && (
              <p className="text-destructive text-[11px] font-medium">{errors.procedure.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Hallazgos / técnica</Label>
            <Textarea
              {...register('findings')}
              className="resize-none h-16 bg-muted/30 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Complicaciones</Label>
            <Textarea
              {...register('complications')}
              placeholder="Ninguna / descripción"
              className="resize-none h-14 bg-muted/30 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Insumos (suturas, implantes)</Label>
            <Input {...register('supplies')} className="bg-muted/30 focus:bg-white transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          <ClipboardList size={14} className="text-primary/60" />
          <span>Post-operatorio</span>
        </div>
      }>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Notas post-operatorias</Label>
            <Textarea
              {...register('post_op_notes')}
              className="resize-none h-16 bg-muted/30 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Indicaciones de recuperación (dueño)</Label>
            <Textarea
              {...register('recovery_instructions')}
              className="resize-none h-16 bg-muted/30 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-bold">Próximo control / retiro de puntos</Label>
            <Input
              type="date"
              {...register('follow_up_date')}
              className="bg-muted/30 focus:bg-white transition-all"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title={
        <div className="flex items-center gap-2">
          <Pill size={14} className="text-primary/60" />
          <span>Prescripción</span>
        </div>
      }>
        <PrescriptionsFields
          control={control as unknown as Control<MedicalRecordFormValues>}
          setValue={setValue as any}
        />
      </FormSection>

      <div className="px-5 py-4 border-t border-border">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full justify-center gap-2 py-3 text-base font-semibold"
        >
          <Syringe size={16} />
          {isSubmitting ? 'Registrando...' : 'Registrar y concluir cirugía'}
        </Button>
      </div>
    </form>
  )
}

export function SurgeryPanel({ appointment, onClose, onRefresh }: PanelProps) {
  const [loading, setLoading] = useState(false)
  const [surgery, setSurgery] = useState<SurgeryStub | null>(null)
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null)
  const isActive = ACTIVE_STATUSES.includes(appointment.status)

  useEffect(() => {
    setLoading(true)
    setSurgery(null)
    fetch(`/api/servicios/cirugia?appointmentId=${appointment.id}`)
      .then(r => r.json())
      .then(json => setSurgery(json.data ?? null))
      .catch(() => setSurgery(null))
      .finally(() => setLoading(false))
  }, [appointment.id])

  async function transition(newStatus: string) {
    setLoadingStatus(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      onClose()
      onRefresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setLoadingStatus(null)
    }
  }

  if (loading) return <p className="text-sm text-center text-muted-foreground py-1">Cargando…</p>

  // Completed — green summary
  if (surgery?.ended_at || appointment.status === 'completed') {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">Cirugía registrada</p>
        </div>
        {surgery?.procedure && (
          <p className="text-xs text-green-700 pl-[22px]">{surgery.procedure}</p>
        )}
        {surgery?.id && (
          <div className="pl-[22px]">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = `/dashboard/servicios/cirugia/${surgery.id}`}
            >
              Ver detalles
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Terminal states
  if (!isActive) {
    return (
      <p className="text-sm text-center text-muted-foreground py-1">
        {appointment.status === 'cancelled' && 'Esta cirugía fue cancelada.'}
        {appointment.status === 'no_show' && 'El paciente no se presentó.'}
      </p>
    )
  }

  // Active — show conclusion form + status transitions below
  return (
    <div>
      {surgery?.id ? (
        <ConclusionForm
          visitId={surgery.id}
          onSuccess={() => { onClose(); onRefresh() }}
        />
      ) : (
        <p className="text-sm text-center text-muted-foreground py-4">
          Sin datos de cirugía. Agendá desde la página de Cirugías.
        </p>
      )}
      <div className="flex items-center justify-center gap-4 px-5 pb-4 pt-2">
        {appointment.status === 'scheduled' && (
          <>
            <button
              type="button"
              onClick={() => transition('confirmed')}
              disabled={loadingStatus === 'confirmed'}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              {loadingStatus === 'confirmed' ? 'Confirmando…' : 'Confirmar cita'}
            </button>
            <span className="text-border text-xs">·</span>
          </>
        )}
        <button
          type="button"
          onClick={() => transition('no_show')}
          disabled={loadingStatus === 'no_show'}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          {loadingStatus === 'no_show' ? 'Guardando…' : 'No se presentó'}
        </button>
        <span className="text-border text-xs">·</span>
        <button
          type="button"
          onClick={() => transition('cancelled')}
          disabled={loadingStatus === 'cancelled'}
          className="text-xs text-destructive/60 hover:text-destructive transition-colors disabled:opacity-40"
        >
          {loadingStatus === 'cancelled' ? 'Guardando…' : 'Cancelar'}
        </button>
      </div>
    </div>
  )
}
