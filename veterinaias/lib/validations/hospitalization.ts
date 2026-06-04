import { z } from 'zod'

export const admitPatientSchema = z.object({
  source_visit_id: z.string().uuid('Visita de origen requerida'),
  reason: z.string().min(1, 'Motivo de hospitalización requerido'),
  diagnosis: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  treatment_plan: z.string().optional(),
  admitted_by: z.string().uuid().optional(),
})

export const dischargeSchema = z.object({
  ended_at: z.string().datetime(),
  discharge_notes: z.string().optional(),
  discharge_diagnosis: z.string().optional(),
  post_discharge_instructions: z.string().optional(),
  prescriptions: z.array(z.object({
    medication_name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
    route_of_administration: z.string().optional(),
    notes: z.string().optional(),
  })).optional().default([]),
})

export const hospitalizationDailyLogSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
  notes: z.string().optional(),
  medications: z.string().optional(),
  fed: z.boolean().optional().default(false),
  temperature: z.number().min(30).max(45).optional(),
})

export type AdmitPatientValues = z.infer<typeof admitPatientSchema>
export type DischargeValues = z.infer<typeof dischargeSchema>
export type HospitalizationDailyLogValues = z.infer<typeof hospitalizationDailyLogSchema>
