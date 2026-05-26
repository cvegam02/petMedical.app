import { z } from 'zod'

export const appointmentSchema = z.object({
  pet_id: z.string().uuid('Mascota es requerida'),
  owner_id: z.string().uuid('Dueño es requerido'),
  assigned_to: z.string().uuid().optional().nullable(),
  scheduled_at: z.string().datetime('Fecha y hora inválidas'),
  duration_minutes: z.preprocess(
    v => Number(v),
    z.number().int().min(15, 'Mínimo 15 minutos').max(180, 'Máximo 3 horas')
  ),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

export const updateAppointmentSchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.preprocess(
    v => Number(v),
    z.number().int().min(15).max(180)
  ).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

// Para el formulario del cliente (scheduled_at es el string del datetime-local input)
export const appointmentFormSchema = z.object({
  pet_id: z.string().uuid('Mascota es requerida'),
  owner_id: z.string().uuid('Dueño es requerido'),
  scheduled_at: z.string().min(1, 'Fecha y hora son requeridas'),
  duration_minutes: z.preprocess(v => Number(v), z.number().int().min(15).max(180)),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>
export type UpdateAppointmentValues = z.infer<typeof updateAppointmentSchema>
