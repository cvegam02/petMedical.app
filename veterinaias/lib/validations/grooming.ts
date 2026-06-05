// lib/validations/grooming.ts
import { z } from 'zod'

export const groomingServiceCatalogSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  duration_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().positive('Debe ser mayor a 0').optional()
  ),
  notes: z.string().optional(),
})

export const updateGroomingServiceCatalogSchema = groomingServiceCatalogSchema.partial().extend({
  active: z.boolean().optional(),
})

export const groomingSessionSchema = z.object({
  pet_id: z.string().uuid('Mascota requerida'),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  services: z
    .array(
      z.object({
        service_name: z.string().min(1),
        service_catalog_id: z.string().uuid().optional(),
      })
    )
    .default([]),
  notes: z.string().optional(),
  intake_notes: z.string().optional(),
  appointment_id: z.string().uuid().optional(),
  started_at: z.string().datetime().optional(),
})

export type GroomingServiceCatalogFormValues = z.infer<typeof groomingServiceCatalogSchema>
export type GroomingSessionFormValues = z.infer<typeof groomingSessionSchema>
