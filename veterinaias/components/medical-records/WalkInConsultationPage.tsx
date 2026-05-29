'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/ui/form-section'
import { PrescriptionsFields } from './PrescriptionsFields'
import { WalkInPetForm } from './WalkInPetForm'
import { OwnerResolutionModal } from './OwnerResolutionModal'
import {
  walkInRecordSchema,
  type WalkInPetValues,
  type WalkInRecordValues,
  type WalkInOwnerValue,
} from '@/lib/validations/medical-record'

const TEXTAREA_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground'

const DEFAULT_PET: WalkInPetValues = {
  name: '',
  species_id: '',
  sex: 'unknown',
}

export function WalkInConsultationPage() {
  const router = useRouter()
  const [petValues, setPetValues] = useState<WalkInPetValues>(DEFAULT_PET)
  const [petErrors, setPetErrors] = useState<Partial<Record<keyof WalkInPetValues, string>>>({})
  const [showPrescriptions, setShowPrescriptions] = useState(false)
  const [ownerModalOpen, setOwnerModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pendingRecordRef = useRef<{ record: WalkInRecordValues; pet: WalkInPetValues } | null>(null)

  const petReady = petValues.name.trim().length > 0 && petValues.species_id.length > 0

  const { register, handleSubmit, control, formState: { errors } } = useForm<WalkInRecordValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(walkInRecordSchema) as any,
    defaultValues: { prescriptions: [] },
  })

  function validatePet(): boolean {
    const errs: Partial<Record<keyof WalkInPetValues, string>> = {}
    if (!petValues.name.trim()) errs.name = 'Nombre es requerido'
    if (!petValues.species_id) errs.species_id = 'Especie es requerida'
    setPetErrors(errs)
    return Object.keys(errs).length === 0
  }

  function onRecordValid(recordValues: WalkInRecordValues) {
    if (!validatePet()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    pendingRecordRef.current = { record: recordValues, pet: petValues }
    setOwnerModalOpen(true)
  }

  async function handleOwnerResolved(owner: WalkInOwnerValue) {
    const pending = pendingRecordRef.current
    if (!pending) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/consultations/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet: pending.pet, record: pending.record, owner }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Error al guardar la consulta')
        return
      }
      setOwnerModalOpen(false)
      router.push(`/dashboard/pets/${json.petId}/records/${json.recordId}`)
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">Nueva consulta</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Este registro será <strong>inmutable</strong> una vez guardado. Verifica la información antes de continuar.
        </p>

        <WalkInPetForm
          values={petValues}
          onChange={setPetValues}
          errors={petErrors}
          onPetSelected={() => {}}
        />

        {petReady && (
          <form onSubmit={handleSubmit(onRecordValid)} className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              <FormSection title="Triaje">
                <div className="space-y-1">
                  <Label htmlFor="reason">Motivo de consulta <span className="text-destructive">*</span></Label>
                  <Input
                    id="reason"
                    {...register('reason')}
                    placeholder="Ej. Control de vacunas, pérdida de apetito..."
                  />
                  {errors.reason && <p className="text-destructive text-xs mt-1">{errors.reason.message}</p>}
                </div>
                <div className="grid grid-cols-4 gap-3 mt-4">
                  <div className="space-y-1">
                    <Label htmlFor="weight_kg">Peso (kg)</Label>
                    <Input id="weight_kg" type="number" step="0.01" placeholder="0.0"
                      {...register('weight_kg', { valueAsNumber: true })} />
                    {errors.weight_kg && <p className="text-destructive text-xs mt-1">{errors.weight_kg.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="temperature_celsius">Temp (°C)</Label>
                    <Input id="temperature_celsius" type="number" step="0.1" placeholder="38.5"
                      {...register('temperature_celsius', { valueAsNumber: true })} />
                    {errors.temperature_celsius && <p className="text-destructive text-xs mt-1">{errors.temperature_celsius.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="heart_rate_bpm">FC (lpm)</Label>
                    <Input id="heart_rate_bpm" type="number" placeholder="80"
                      {...register('heart_rate_bpm', { valueAsNumber: true })} />
                    {errors.heart_rate_bpm && <p className="text-destructive text-xs mt-1">{errors.heart_rate_bpm.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="respiratory_rate_bpm">FR (rpm)</Label>
                    <Input id="respiratory_rate_bpm" type="number" placeholder="20"
                      {...register('respiratory_rate_bpm', { valueAsNumber: true })} />
                    {errors.respiratory_rate_bpm && <p className="text-destructive text-xs mt-1">{errors.respiratory_rate_bpm.message}</p>}
                  </div>
                </div>
              </FormSection>

              <FormSection title="Evaluación">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="diagnosis">Diagnóstico</Label>
                    <textarea id="diagnosis" {...register('diagnosis')} rows={4}
                      className={TEXTAREA_CLASS} placeholder="Cuadro clínico observado..." />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="treatment">Tratamiento</Label>
                    <textarea id="treatment" {...register('treatment')} rows={4}
                      className={TEXTAREA_CLASS} placeholder="Procedimientos realizados o indicados..." />
                  </div>
                </div>
                <div className="space-y-1 mt-4">
                  <Label htmlFor="notes">Notas internas</Label>
                  <textarea id="notes" {...register('notes')} rows={2}
                    className={TEXTAREA_CLASS} placeholder="Notas confidenciales para el equipo..." />
                </div>
              </FormSection>

              <FormSection title="Recetas">
                {!showPrescriptions ? (
                  <button
                    type="button"
                    onClick={() => setShowPrescriptions(true)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus size={14} />
                    Agregar receta
                  </button>
                ) : (
                  <PrescriptionsFields control={control as any} />
                )}
              </FormSection>

              <div className="px-5 py-4 bg-muted/30 flex items-center gap-3">
                <Button type="submit" disabled={isSubmitting || ownerModalOpen}>
                  Finalizar consulta
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      <OwnerResolutionModal
        isOpen={ownerModalOpen}
        onConfirm={handleOwnerResolved}
        onClose={() => setOwnerModalOpen(false)}
        isSubmitting={isSubmitting}
      />
    </>
  )
}
