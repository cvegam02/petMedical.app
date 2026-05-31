import { z } from 'zod'

export const vaccinationEntrySchema = z.object({
  vaccine_name: z.string().min(1),
  vaccine_catalog_id: z.string().uuid().optional(),
  lot_number: z.string().optional(),
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_due_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.string().optional(),
})

export const dewormingEntrySchema = z.object({
  product_name: z.string().min(1),
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_due_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.string().optional(),
})

export const prescriptionSchema = z.object({
  medication_catalog_id: z.string().uuid().optional(),
  medication_name: z.string().min(1, 'Nombre del medicamento es requerido'),
  active_ingredient: z.string().optional(),
  dosage: z.string().min(1, 'Dosis es requerida'),
  suggested_dose: z.string().optional(),
  route_of_administration: z.string().optional(),
  frequency: z.string().min(1, 'Frecuencia es requerida'),
  duration: z.string().min(1, 'Duración es requerida'),
  notes: z.string().optional(),
})

export const medicalRecordSchema = z.object({
  pet_id: z.string().uuid('Mascota es requerida'),
  attended_by: z.string().uuid('Veterinario inválido').optional(),
  reason: z.string().min(1, 'Motivo de consulta es requerido'),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  weight_kg: z.preprocess(
    v => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
    z.number().positive().optional()
  ),
  temperature_celsius: z.preprocess(
    v => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
    z.number().positive().optional()
  ),
  heart_rate_bpm: z.preprocess(
    v => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
    z.number().int().positive().optional()
  ),
  respiratory_rate_bpm: z.preprocess(
    v => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
    z.number().int().positive().optional()
  ),
  prescriptions: z.array(prescriptionSchema).default([]),
  vaccinations: z.array(vaccinationEntrySchema).default([]),
  dewormings: z.array(dewormingEntrySchema).default([]),
  appointment_id: z.string().uuid().optional(),
})

export const addendumSchema = z.object({
  content: z.string().min(1, 'El contenido de la adenda es requerido'),
})

export type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>
export type PrescriptionFormValues = z.infer<typeof prescriptionSchema>
export type AddendumFormValues = z.infer<typeof addendumSchema>
export type VaccinationEntryValues = z.infer<typeof vaccinationEntrySchema>
export type DewormingEntryValues = z.infer<typeof dewormingEntrySchema>

export const walkInPetSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  species_id: z.string().uuid('Especie es requerida'),
  breed: z.string().optional(),
  sex: z.enum(['male', 'female', 'unknown']).default('unknown'),
  date_of_birth: z.preprocess(
    v => (v === '' ? undefined : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  ),
})

export const walkInRecordSchema = z.object({
  attended_by: z.string().uuid('Veterinario inválido').optional(),
  reason: z.string().min(1, 'Motivo de consulta es requerido'),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  weight_kg: z.preprocess(
    v => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
    z.number().positive().optional()
  ),
  temperature_celsius: z.preprocess(
    v => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
    z.number().positive().optional()
  ),
  heart_rate_bpm: z.preprocess(
    v => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
    z.number().int().positive().optional()
  ),
  respiratory_rate_bpm: z.preprocess(
    v => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
    z.number().int().positive().optional()
  ),
  prescriptions: z.array(prescriptionSchema).default([]),
  vaccinations: z.array(vaccinationEntrySchema).default([]),
  dewormings: z.array(dewormingEntrySchema).default([]),
})

const existingOwnerSchema = z.object({ id: z.string().uuid() })
const newOwnerSchema = z.object({
  full_name: z.string().min(1, 'Nombre es requerido'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
})

export const walkInOwnerSchema = z.union([existingOwnerSchema, newOwnerSchema]).nullable()

export const walkInConsultationSchema = z.object({
  pet: walkInPetSchema,
  record: walkInRecordSchema,
  owner: walkInOwnerSchema,
})

export type WalkInPetValues = z.infer<typeof walkInPetSchema>
export type WalkInRecordValues = z.infer<typeof walkInRecordSchema>
export type WalkInOwnerValue = z.infer<typeof walkInOwnerSchema>
export type WalkInConsultationValues = z.infer<typeof walkInConsultationSchema>

export const walkInConsultationExistingPetSchema = z.object({
  existingPetId: z.string().uuid('Pet ID inválido'),
  record: walkInRecordSchema,
})

export type WalkInConsultationExistingPetValues = z.infer<typeof walkInConsultationExistingPetSchema>
