'use client'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Stethoscope, ClipboardList, Syringe, Pill, Save } from 'lucide-react'
import { medicalRecordSchema, type MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { PatientDataSection, type PatientDataValues } from './PatientDataSection'
import { AttendingVetField, type TenantVet } from './AttendingVetField'
import { PrescriptionsFields } from './PrescriptionsFields'
import { VaccinationsField } from './VaccinationsField'
import { DewormingsField } from './DewormingsField'
import { FormSection } from '@/components/ui/form-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export interface IncompletePatient {
  owner: { id: string; full_name: string; phone: string | null; email: string | null }
  pet: { id: string; species_id: string | null; sex: string; date_of_birth: string | null } | null
}

interface MedicalRecordFormProps {
  petId: string
  appointmentId?: string
  incompletePatient?: IncompletePatient | null
  vets?: TenantVet[]
  currentVetId?: string
}

export function MedicalRecordForm({ petId, appointmentId, incompletePatient, vets = [], currentVetId = '' }: MedicalRecordFormProps) {
  const router = useRouter()
  const patientDataRef = useRef<PatientDataValues | null>(null)
  const [showPrescriptions, setShowPrescriptions] = useState(false)

  const currentIsAttendee = vets.some(v => v.id === currentVetId)
  const defaultAttendedBy = currentIsAttendee ? currentVetId : ''
  const showVetSelector = vets.length > 0 && (vets.length > 1 || !currentIsAttendee)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema) as any,
    defaultValues: {
      pet_id: petId,
      attended_by: defaultAttendedBy,
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
    if (showVetSelector && !values.attended_by) {
      toast.error('Selecciona el veterinario que atiende')
      return
    }
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

      const [recordRes] = await (Promise.all(tasks) as Promise<[Response, ...unknown[]]>)
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

      <div className="bg-card border border-border shadow-xl shadow-primary/[0.01] rounded-2xl overflow-hidden divide-y divide-border/60">
        <FormSection 
          title={
            <div className="flex items-center gap-2">
              <Stethoscope size={16} className="text-primary/60" />
              <span>Triaje</span>
            </div>
          }
        >
          {showVetSelector && (
            <div className="mb-6">
              <AttendingVetField
                vets={vets}
                value={watch('attended_by') ?? ''}
                onChange={(v) => setValue('attended_by', v)}
                currentVetId={currentVetId}
              />
            </div>
          )}
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="temperature_celsius" className="text-[12px] font-bold">Temp (°C)</Label>
              <Input id="temperature_celsius" type="number" step="0.1" placeholder="38.5"
                className="bg-muted/30 focus:bg-white transition-all font-mono"
                {...register('temperature_celsius', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="heart_rate_bpm" className="text-[12px] font-bold">FC (lpm)</Label>
              <Input id="heart_rate_bpm" type="number" placeholder="80"
                className="bg-muted/30 focus:bg-white transition-all font-mono"
                {...register('heart_rate_bpm', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="respiratory_rate_bpm" className="text-[12px] font-bold">FR (rpm)</Label>
              <Input id="respiratory_rate_bpm" type="number" placeholder="20"
                className="bg-muted/30 focus:bg-white transition-all font-mono"
                {...register('respiratory_rate_bpm', { valueAsNumber: true })} />
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
              <PrescriptionsFields control={control as any} setValue={setValue} />
            </div>
          )}
        </FormSection>

        <div className="px-8 py-5 bg-muted/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              type="submit" 
              size="lg"
              disabled={isSubmitting}
              className="shadow-md shadow-primary/20"
            >
              {isSubmitting ? (
                'Procesando...'
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Finalizar consulta
                </>
              )}
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
            El registro médico será<br />inmutable tras guardar
          </p>
        </div>
      </div>
    </form>
  )
}
