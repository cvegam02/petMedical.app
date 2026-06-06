import { z } from 'zod'

// Check-in: crea la estancia ligada a una cita.
export const boardingCheckInSchema = z.object({
  pet_id: z.string().uuid('Mascota requerida'),
  appointment_id: z.string().uuid('Cita requerida'),
  expected_check_out: z.string().datetime('Fecha/hora de salida inválida').optional(),
  feeding_instructions: z.string().optional(),
  belongings: z.string().optional(),
  special_care: z.string().optional(),
})

export const boardingCheckOutSchema = z.object({
  ended_at: z.string().datetime(),
  notes: z.string().optional(),
})

export const boardingDailyLogSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
  notes: z.string().optional(),
  fed: z.boolean().optional().default(false),
  walked: z.boolean().optional().default(false),
})

export type BoardingCheckInValues = z.infer<typeof boardingCheckInSchema>
export type BoardingDailyLogValues = z.infer<typeof boardingDailyLogSchema>
