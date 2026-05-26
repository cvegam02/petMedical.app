'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { medicalRecordSchema, type MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { PrescriptionsFields } from './PrescriptionsFields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MedicalRecordFormProps {
  petId: string
}

export function MedicalRecordForm({ petId }: MedicalRecordFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: { pet_id: petId, prescriptions: [] },
  })

  const onSubmit = async (values: MedicalRecordFormValues) => {
    try {
      const res = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register('pet_id')} />

      <div>
        <Label htmlFor="reason">Motivo de consulta *</Label>
        <Input id="reason" {...register('reason')} placeholder="Razón de la visita" />
        {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="diagnosis">Diagnóstico</Label>
          <textarea
            id="diagnosis"
            {...register('diagnosis')}
            rows={3}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none"
            placeholder="Diagnóstico del veterinario"
          />
        </div>
        <div>
          <Label htmlFor="treatment">Tratamiento</Label>
          <textarea
            id="treatment"
            {...register('treatment')}
            rows={3}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none"
            placeholder="Tratamiento indicado"
          />
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">Signos Vitales</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <Label htmlFor="weight_kg" className="text-xs">Peso (kg)</Label>
            <Input id="weight_kg" type="number" step="0.01" {...register('weight_kg', { valueAsNumber: true })} placeholder="ej. 12.5" />
          </div>
          <div>
            <Label htmlFor="temperature_celsius" className="text-xs">Temperatura (°C)</Label>
            <Input id="temperature_celsius" type="number" step="0.1" {...register('temperature_celsius', { valueAsNumber: true })} placeholder="ej. 38.5" />
          </div>
          <div>
            <Label htmlFor="heart_rate_bpm" className="text-xs">Frecuencia cardíaca (lpm)</Label>
            <Input id="heart_rate_bpm" type="number" {...register('heart_rate_bpm', { valueAsNumber: true })} placeholder="ej. 80" />
          </div>
          <div>
            <Label htmlFor="respiratory_rate_bpm" className="text-xs">Frecuencia respiratoria (rpm)</Label>
            <Input id="respiratory_rate_bpm" type="number" {...register('respiratory_rate_bpm', { valueAsNumber: true })} placeholder="ej. 20" />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notas del veterinario</Label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none"
          placeholder="Observaciones adicionales"
        />
      </div>

      <PrescriptionsFields control={control} />

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar expediente'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
