'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { medicalRecordSchema, type MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { PrescriptionsFields } from './PrescriptionsFields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Stethoscope, Activity, ClipboardList, Pill, Save, X, Heart, Thermometer } from 'lucide-react'

interface MedicalRecordFormProps {
  petId: string
  appointmentId?: string
}

export function MedicalRecordForm({ petId, appointmentId }: MedicalRecordFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema) as any,
    defaultValues: { 
      pet_id: petId, 
      prescriptions: [],
      ...(appointmentId ? { appointment_id: appointmentId } : {})
    },
  })

  const onSubmit = async (values: MedicalRecordFormValues) => {
    try {
      const res = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          ...(appointmentId ? { appointment_id: appointmentId } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error ?? 'Error al guardar el expediente'); return }
      router.push(`/dashboard/pets/${petId}/records/${json.data.id}`)
      router.refresh()
    } catch {
      alert('Error de red. Intenta de nuevo.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 pb-24">
      <input type="hidden" {...register('pet_id')} />
      {appointmentId && <input type="hidden" {...register('appointment_id')} />}

      {/* PHASE 01: TRIAGE */}
      <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <Stethoscope size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">01. Triaje Inicial</h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">Motivo y Signos Vitales</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-12">
            <Label htmlFor="reason" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 block">Motivo de consulta *</Label>
            <Input 
              id="reason" 
              {...register('reason')} 
              placeholder="Ej. Control de vacunas, pérdida de apetito, cirugía programada..." 
              className="bg-white border-zinc-200 focus:ring-4 focus:ring-primary/5 rounded-2xl py-7 text-lg font-medium shadow-sm transition-all"
            />
            {errors.reason && <p className="text-destructive text-xs mt-2 font-bold flex items-center gap-1"><X size={12} /> {errors.reason.message}</p>}
          </div>

          <div className="md:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/20 p-8 rounded-[2rem] border border-zinc-100/50 shadow-inner">
            <div className="space-y-3">
              <Label htmlFor="weight_kg" className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5 tracking-wider">
                <Activity size={11} className="text-primary" /> Peso (kg)
              </Label>
              <Input id="weight_kg" type="number" step="0.01" {...register('weight_kg', { valueAsNumber: true })} className="bg-white border-zinc-200/60 rounded-xl font-mono tabular-nums h-12 text-base" placeholder="0.00" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="temperature_celsius" className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5 tracking-wider">
                <Thermometer size={11} className="text-primary" /> Temp (°C)
              </Label>
              <Input id="temperature_celsius" type="number" step="0.1" {...register('temperature_celsius', { valueAsNumber: true })} className="bg-white border-zinc-200/60 rounded-xl font-mono tabular-nums h-12 text-base" placeholder="38.5" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="heart_rate_bpm" className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5 tracking-wider">
                <Heart size={11} className="text-primary" /> FC (lpm)
              </Label>
              <Input id="heart_rate_bpm" type="number" {...register('heart_rate_bpm', { valueAsNumber: true })} className="bg-white border-zinc-200/60 rounded-xl font-mono tabular-nums h-12 text-base" placeholder="80" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="respiratory_rate_bpm" className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5 tracking-wider">
                <Activity size={11} className="rotate-90 text-primary" /> FR (rpm)
              </Label>
              <Input id="respiratory_rate_bpm" type="number" {...register('respiratory_rate_bpm', { valueAsNumber: true })} className="bg-white border-zinc-200/60 rounded-xl font-mono tabular-nums h-12 text-base" placeholder="20" />
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 02: EVALUATION */}
      <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
        <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <ClipboardList size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">02. Evaluación Médica</h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">Diagnóstico y Evolución</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <Label htmlFor="diagnosis" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">Diagnóstico Clínico</Label>
            <textarea
              id="diagnosis"
              {...register('diagnosis')}
              rows={5}
              className="w-full bg-white border border-zinc-200 rounded-[1.5rem] px-5 py-4 text-sm resize-none focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all font-medium shadow-sm leading-relaxed"
              placeholder="Describa el cuadro clínico observado..."
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="treatment" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">Plan de Tratamiento</Label>
            <textarea
              id="treatment"
              {...register('treatment')}
              rows={5}
              className="w-full bg-white border border-zinc-200 rounded-[1.5rem] px-5 py-4 text-sm resize-none focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all font-medium shadow-sm leading-relaxed"
              placeholder="Procedimientos realizados o indicados..."
            />
          </div>
          <div className="md:col-span-2 space-y-3">
            <Label htmlFor="notes" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">Observaciones Internas</Label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={3}
              className="w-full bg-muted/30 border border-zinc-200/60 rounded-2xl px-5 py-4 text-sm resize-none focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all italic text-zinc-600 leading-relaxed"
              placeholder="Notas confidenciales para el equipo..."
            />
          </div>
        </div>
      </section>

      {/* PHASE 03: PLAN */}
      <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 delay-300">
        <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <Pill size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">03. Gestión de Recetas</h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">Medicamentos y Dosis</p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-border/60 shadow-xl shadow-primary/5 p-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
           <PrescriptionsFields control={control} />
        </div>
      </section>

      {/* ACTIONS BAR - HIGH FIDELITY STICKY BAR */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-2 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-8 duration-700 fill-mode-both delay-500">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => router.back()}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-2xl px-6 h-12"
        >
          <X size={18} className="mr-2" />
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl px-8 h-12 shadow-lg shadow-primary/20 active:scale-[0.95] transition-all"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Activity size={18} className="animate-spin" /> Procesando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save size={18} strokeWidth={2.5} /> Finalizar Consulta
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}
