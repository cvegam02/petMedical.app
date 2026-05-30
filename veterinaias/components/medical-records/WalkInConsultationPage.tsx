'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, X, Stethoscope, ClipboardList, Pill, Save, Syringe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/ui/form-section'
import { PrescriptionsFields } from './PrescriptionsFields'
import { VaccinationsField } from './VaccinationsField'
import { DewormingsField } from './DewormingsField'
import { WalkInPetForm } from './WalkInPetForm'
import { ExpandablePetBanner } from './ExpandablePetBanner'
import { OwnerResolutionModal } from './OwnerResolutionModal'
import { type PetSearchResult } from './PetSearchCombobox'
import {
  walkInRecordSchema,
  type WalkInPetValues,
  type WalkInRecordValues,
  type WalkInOwnerValue,
} from '@/lib/validations/medical-record'

const DEFAULT_PET: WalkInPetValues = {
  name: '',
  species_id: '',
  sex: 'unknown',
}

export function WalkInConsultationPage() {
  const router = useRouter()
  const [petValues, setPetValues] = useState<WalkInPetValues>(DEFAULT_PET)
  const [petErrors, setPetErrors] = useState<Partial<Record<keyof WalkInPetValues, string>>>({})
  const [selectedPet, setSelectedPet] = useState<PetSearchResult | null>(null)
  const [showPrescriptions, setShowPrescriptions] = useState(false)
  const [ownerModalOpen, setOwnerModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pendingRecordRef = useRef<{ record: WalkInRecordValues; pet: WalkInPetValues } | null>(null)

  const petReady = selectedPet !== null || (petValues.name.trim().length > 0 && petValues.species_id.length > 0)

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<WalkInRecordValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(walkInRecordSchema) as any,
    defaultValues: { 
      prescriptions: [],
      vaccinations: [],
      dewormings: [],
    },
  })

  function validatePet(): boolean {
    const errs: Partial<Record<keyof WalkInPetValues, string>> = {}
    if (!petValues.name.trim()) errs.name = 'Nombre es requerido'
    if (!petValues.species_id) errs.species_id = 'Especie es requerida'
    setPetErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function onRecordValid(recordValues: WalkInRecordValues) {
    if (selectedPet) {
      setIsSubmitting(true)
      try {
        const res = await fetch('/api/consultations/walk-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ existingPetId: selectedPet.pet_id, record: recordValues }),
        })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json.error ?? 'Error al guardar la consulta')
          return
        }
        router.push(`/dashboard/pets/${json.petId}/records/${json.recordId}`)
      } catch {
        toast.error('Error de red. Intenta de nuevo.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

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

  function handleClearSelectedPet() {
    setSelectedPet(null)
    setPetValues(DEFAULT_PET)
    setPetErrors({})
  }

  return (
    <>
      <div className="max-w-3xl mx-auto pb-20">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Expediente</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Nueva consulta</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Este registro será <strong>inmutable</strong> una vez guardado. Verifica la información antes de continuar.
        </p>

        {/* Pet section: banner when existing pet selected, form otherwise */}
        <div className="mb-6 sticky top-0 z-10">
          {selectedPet ? (
            <ExpandablePetBanner
              petId={selectedPet.pet_id}
              name={selectedPet.pet_name}
              species={selectedPet.species_name}
              breed={selectedPet.breed_name}
              ownerName={selectedPet.owner_name}
              onClear={handleClearSelectedPet}
            />
          ) : (
            <WalkInPetForm
              values={petValues}
              onChange={setPetValues}
              errors={petErrors}
              onPetSelected={setSelectedPet}
            />
          )}
        </div>

        {petReady && (
          <form onSubmit={handleSubmit(onRecordValid)} className="animate-in fade-in slide-in-from-top-3 duration-500 fill-mode-both">
            <div className="bg-white border border-border shadow-xl shadow-primary/[0.01] rounded-2xl overflow-hidden divide-y divide-border/60">
              <FormSection 
                title={
                  <div className="flex items-center gap-2">
                    <Stethoscope size={16} className="text-primary/60" />
                    <span>Triaje</span>
                  </div>
                }
              >
                <div className="space-y-1.5">
                  <Label htmlFor="reason" className="text-[13px] font-bold">Motivo de consulta <span className="text-destructive">*</span></Label>
                  <Input
                    id="reason"
                    {...register('reason')}
                    placeholder="Ej. Control de vacunas, pérdida de apetito..."
                    className="bg-muted/30 focus:bg-white transition-all"
                  />
                  {errors.reason && <p className="text-destructive text-[11px] font-medium mt-1">{errors.reason.message}</p>}
                </div>
                <div className="grid grid-cols-4 gap-4 mt-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="weight_kg" className="text-[12px] font-bold">Peso (kg)</Label>
                    <Input id="weight_kg" type="number" step="0.01" placeholder="0.0"
                      className="bg-muted/30 focus:bg-white transition-all font-mono"
                      {...register('weight_kg', { valueAsNumber: true })} />
                    {errors.weight_kg && <p className="text-destructive text-[11px] font-medium mt-1">{errors.weight_kg.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="temperature_celsius" className="text-[12px] font-bold">Temp (°C)</Label>
                    <Input id="temperature_celsius" type="number" step="0.1" placeholder="38.5"
                      className="bg-muted/30 focus:bg-white transition-all font-mono"
                      {...register('temperature_celsius', { valueAsNumber: true })} />
                    {errors.temperature_celsius && <p className="text-destructive text-[11px] font-medium mt-1">{errors.temperature_celsius.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="heart_rate_bpm" className="text-[12px] font-bold">FC (lpm)</Label>
                    <Input id="heart_rate_bpm" type="number" placeholder="80"
                      className="bg-muted/30 focus:bg-white transition-all font-mono"
                      {...register('heart_rate_bpm', { valueAsNumber: true })} />
                    {errors.heart_rate_bpm && <p className="text-destructive text-[11px] font-medium mt-1">{errors.heart_rate_bpm.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="respiratory_rate_bpm" className="text-[12px] font-bold">FR (rpm)</Label>
                    <Input id="respiratory_rate_bpm" type="number" placeholder="20"
                      className="bg-muted/30 focus:bg-white transition-all font-mono"
                      {...register('respiratory_rate_bpm', { valueAsNumber: true })} />
                    {errors.respiratory_rate_bpm && <p className="text-destructive text-[11px] font-medium mt-1">{errors.respiratory_rate_bpm.message}</p>}
                  </div>
                </div>
              </FormSection>

              <FormSection 
                title={
                  <div className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-primary/60" />
                    <span>Evaluación Clínica</span>
                  </div>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="diagnosis" className="text-[13px] font-bold text-foreground">Diagnóstico</Label>
                    <Textarea id="diagnosis" {...register('diagnosis')} rows={4}
                      className="bg-muted/30 focus:bg-white transition-all resize-none"
                      placeholder="Cuadro clínico observado..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="treatment" className="text-[13px] font-bold text-foreground">Tratamiento</Label>
                    <Textarea id="treatment" {...register('treatment')} rows={4}
                      className="bg-muted/30 focus:bg-white transition-all resize-none"
                      placeholder="Procedimientos realizados o indicados..." />
                  </div>
                </div>
                <div className="space-y-1.5 mt-6">
                  <Label htmlFor="notes" className="text-[13px] font-bold text-foreground/70">Notas internas</Label>
                  <Textarea id="notes" {...register('notes')} rows={2}
                    className="bg-muted/30 focus:bg-white transition-all resize-none text-[13px]"
                    placeholder="Notas confidenciales para el equipo..." />
                </div>
              </FormSection>

              <FormSection 
                title={
                  <div className="flex items-center gap-2">
                    <Syringe size={16} className="text-primary/60" />
                    <span>Prevención</span>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Vacunas aplicadas</p>
                    <VaccinationsField control={control as any} setValue={setValue as any} />
                  </div>
                  <div className="pt-4 border-t border-border/40">
                    <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Desparasitaciones</p>
                    <DewormingsField control={control as any} setValue={setValue as any} />
                  </div>
                </div>
              </FormSection>

              <FormSection 
                title={
                  <div className="flex items-center gap-2">
                    <Pill size={16} className="text-primary/60" />
                    <span>Prescripción</span>
                  </div>
                }
              >
                {!showPrescriptions ? (
                  <button
                    type="button"
                    onClick={() => setShowPrescriptions(true)}
                    className="group flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-300"
                  >
                    <Plus size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="font-semibold">Agregar medicamentos a la receta</span>
                  </button>
                ) : (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <PrescriptionsFields control={control as any} setValue={setValue as any} />
                  </div>
                )}
              </FormSection>

              <div className="px-8 py-5 bg-muted/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button 
                    type="submit" 
                    size="lg"
                    disabled={isSubmitting || ownerModalOpen}
                    className="shadow-md shadow-primary/20"
                  >
                    <Save size={16} className="mr-2" />
                    Finalizar consulta
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="lg"
                    onClick={() => router.back()}
                  >
                    Cancelar
                  </Button>
                </div>
                <p className="hidden md:block text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest text-right">
                  Los cambios son permanentes<br />tras el guardado
                </p>
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
