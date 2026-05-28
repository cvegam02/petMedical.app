import { z } from 'zod'

export const prescriptionSchema = z.object({
  medication_name: z.string().min(1, 'Nombre del medicamento es requerido'),
  dosage: z.string().min(1, 'Dosis es requerida'),
  frequency: z.string().min(1, 'Frecuencia es requerida'),
  duration: z.string().min(1, 'Duración es requerida'),
  notes: z.string().optional(),
})

export const medicalRecordSchema = z.object({
  pet_id: z.string().uuid('Mascota es requerida'),
  reason: z.string().min(1, 'Motivo de consulta es requerido'),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  weight_kg: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().positive().optional()
  ),
  temperature_celsius: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().positive().optional()
  ),
  heart_rate_bpm: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().positive().optional()
  ),
  respiratory_rate_bpm: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().positive().optional()
  ),
  prescriptions: z.array(prescriptionSchema).default([]),
  appointment_id: z.string().uuid().optional(),
})

export const addendumSchema = z.object({
  content: z.string().min(1, 'El contenido de la adenda es requerido'),
})

export type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>
export type PrescriptionFormValues = z.infer<typeof prescriptionSchema>
export type AddendumFormValues = z.infer<typeof addendumSchema>

export const walkInPetSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  species_id: z.string().uuid('Especie es requerida'),
  breed_id: z.string().uuid().optional(),
  sex: z.enum(['male', 'female', 'unknown']).default('unknown'),
  date_of_birth: z.preprocess(
    v => (v === '' ? undefined : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  ),
})

export const walkInRecordSchema = z.object({
  reason: z.string().min(1, 'Motivo de consulta es requerido'),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  weight_kg: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().positive().optional()
  ),
  temperature_celsius: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().positive().optional()
  ),
  heart_rate_bpm: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().positive().optional()
  ),
  respiratory_rate_bpm: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().positive().optional()
  ),
  prescriptions: z.array(prescriptionSchema).default([]),
})

const existingOwnerSchema = z.object({ id: z.string().uuid() })
const newOwnerSchema = z.object({
  full_name: z.string().min(1, 'Nombre es requerido'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
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
