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
  weight_kg: z.coerce.number().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  temperature_celsius: z.coerce.number().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  heart_rate_bpm: z.coerce.number().int().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  respiratory_rate_bpm: z.coerce.number().int().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  prescriptions: z.array(prescriptionSchema).default([]),
})

export const addendumSchema = z.object({
  content: z.string().min(1, 'El contenido de la adenda es requerido'),
})

export type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>
export type PrescriptionFormValues = z.infer<typeof prescriptionSchema>
export type AddendumFormValues = z.infer<typeof addendumSchema>
