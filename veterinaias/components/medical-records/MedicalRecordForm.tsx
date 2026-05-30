'use client'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { medicalRecordSchema, type MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { PatientDataSection, type PatientDataValues } from './PatientDataSection'
import { PrescriptionsFields } from './PrescriptionsFields'
import { VaccinationsField } from './VaccinationsField'
import { DewormingsField } from './DewormingsField'
import { FormSection } from '@/components/ui/form-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const TEXTAREA_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50'

export interface IncompletePatient {
  owner: { id: string; full_name: string; phone: string | null; email: string | null }
  pet: { id: string; species_id: string | null; sex: string; date_of_birth: string | null } | null
}

interface MedicalRecordFormProps {
  petId: string
  appointmentId?: string
  incompletePatient?: IncompletePatient | null
}

export function MedicalRecordForm({ petId, appointmentId, incompletePatient }: MedicalRecordFormProps) {
  const router = useRouter()
  const patientDataRef = useRef<PatientDataValues | null>(null)
  const [showPrescriptions, setShowPrescriptions] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema) as any,
    defaultValues: {
      pet_id: petId,
      prescriptions: [],
      vaccinations: [],
      dewormings: [],
      ...(appointmentId ? { appointment_id: appointmentId } : {}),
    },
  })

  async function patchOwner(owner: PatientDataValues['owner']) {
    const body: Record<string, string> = { full_name: owner.full_name }
    if (owner.phone) body.phone = owner.phone
    if (owner.email) body.email = owner.email
    const res = await fetch(`/api/owners/${owner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('owner patch failed')
  }

  async function patchPet(pet: PatientDataValues['pet']) {
    const body: Record<string, string> = {}
    if (pet.species_id) body.species_id = pet.species_id
    if (pet.breed) body.breed = pet.breed
    if (pet.sex && pet.sex !== 'unknown') body.sex = pet.sex
    if (pet.date_of_birth) body.date_of_birth = pet.date_of_birth
    if (Object.keys(body).length === 0) return
    const res = await fetch(`/api/pets/${pet.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('pet patch failed')
  }

  const onSubmit = async (values: MedicalRecordFormValues) => {
    try {
      const tasks: Promise<unknown>[] = [
        fetch('/api/medical-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...values,
            ...(appointmentId ? { appointment_id: appointmentId } : {}),
          }),
        }),
      ]

      if (incompletePatient && patientDataRef.current) {
        tasks.push(
          patchOwner(patientDataRef.current.owner).catch(() => {
            toast.warning('Datos del dueño no guardados — puedes actualizarlos en su perfil.')
          }),
        )
        if (patientDataRef.current.pet && incompletePatient.pet) {
          tasks.push(
            patchPet(patientDataRef.current.pet).catch(() => {
              toast.warning('Datos de la mascota no guardados — puedes actualizarlos en su perfil.')
            }),
          )
        }
      }

      const [recordRes] = await Promise.all(tasks) as [Response, ...unknown[]]
      const json = await recordRes.json()
      if (!recordRes.ok) { toast.error(json.error ?? 'Error al guardar el expediente'); return }

      router.push(`/dashboard/pets/${petId}/records/${json.data.id}`)
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register('pet_id')} />
      {appointmentId && <input type="hidden" {...register('appointment_id')} />}

      {incompletePatient && (
        <div className="mb-6">
          <PatientDataSection
            initialOwner={incompletePatient.owner}
            initialPet={incompletePatient.pet ?? {
              id: petId,
              species_id: null,
              sex: 'unknown',
              date_of_birth: null,
            }}
            onChange={values => { patientDataRef.current = values }}
          />
        </div>
      )}

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
            </div>
            <div className="space-y-1">
              <Label htmlFor="temperature_celsius">Temp (°C)</Label>
              <Input id="temperature_celsius" type="number" step="0.1" placeholder="0.0"
                {...register('temperature_celsius', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="heart_rate_bpm">FC (lpm)</Label>
              <Input id="heart_rate_bpm" type="number" placeholder="0"
                {...register('heart_rate_bpm', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="respiratory_rate_bpm">FR (rpm)</Label>
              <Input id="respiratory_rate_bpm" type="number" placeholder="0"
                {...register('respiratory_rate_bpm', { valueAsNumber: true })} />
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

        <FormSection title="Vacunas y Desparasitación">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Vacunas aplicadas</p>
              <VaccinationsField control={control as any} setValue={setValue as any} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Desparasitaciones</p>
              <DewormingsField control={control as any} />
            </div>
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
            <PrescriptionsFields control={control as any} setValue={setValue as any} />
          )}
        </FormSection>

        <div className="px-5 py-4 bg-muted/30 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Procesando...' : 'Finalizar consulta'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  )
}
