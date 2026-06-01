import { z } from 'zod'

export const appointmentSchema = z.object({
  pet_id: z.string().uuid('Mascota es requerida'),
  owner_id: z.string().uuid('Dueño es requerido'),
  assigned_to: z.string().uuid().optional().nullable(),
  // ISO 8601 with optional TZ offset; form schema uses datetime-local (no TZ) converted client-side
  scheduled_at: z.string().datetime('Fecha y hora inválidas'),
  duration_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().min(15, 'Mínimo 15 minutos').max(180, 'Máximo 3 horas').optional()
  ),
  reason: z.string().optional(),
  notes: z.string().optional(),
  service_type: z.enum(['consultation', 'grooming']).optional().default('consultation'),
})

export const updateAppointmentSchema = appointmentSchema
  .omit({ pet_id: true, owner_id: true })
  .partial()
  .extend({
    status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  })

// Para el formulario del cliente (scheduled_at es el string del datetime-local input)
export const appointmentFormSchema = z.object({
  pet_id: z.string().uuid('Mascota es requerida'),
  owner_id: z.string().uuid('Dueño es requerido'),
  scheduled_at: z.string().min(1, 'Fecha y hora son requeridas'),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

export type AppointmentCreateValues = z.infer<typeof appointmentSchema>
export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>
export type UpdateAppointmentValues = z.infer<typeof updateAppointmentSchema>

export const firstVisitSchema = z.object({
  pet_name: z.string().min(1, 'Nombre de mascota requerido'),
  scheduled_at: z.string().datetime('Fecha y hora inválidas'),
  duration_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().min(15, 'Mínimo 15 minutos').max(180, 'Máximo 3 horas').optional()
  ),
  reason: z.string().optional(),
  notes: z.string().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  service_type: z.enum(['consultation', 'grooming']).optional().default('consultation'),
})

export type FirstVisitValues = z.infer<typeof firstVisitSchema>
