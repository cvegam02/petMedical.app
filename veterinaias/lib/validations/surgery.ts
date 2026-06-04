import { z } from 'zod'
import { prescriptionSchema } from './medical-record'

const weightPreprocess = z.preprocess(
  v => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
  z.number().positive().optional()
)

// Phase 1 — used by ScheduleSurgeryModal → POST /api/servicios/cirugia
export const scheduleSurgerySchema = z.object({
  pet_id: z.string().uuid('Mascota requerida'),
  owner_id: z.string().uuid('Dueño requerido'),
  scheduled_at: z.string().datetime('Fecha y hora inválidas'),
  attended_by: z.string().uuid('Veterinario requerido'),
  diagnosis: z.string().optional(),
  weight_kg: weightPreprocess,
  pre_op_notes: z.string().optional(),
  anesthesia_type: z.string().optional(),
  anesthesia_notes: z.string().optional(),
})
export type ScheduleSurgeryValues = z.infer<typeof scheduleSurgerySchema>

// Phase 2 — used by SurgeryPanel → PATCH /api/servicios/cirugia/[id]
export const concludeSurgerySchema = z.object({
  procedure: z.string().min(1, 'Procedimiento requerido'),
  findings: z.string().optional(),
  complications: z.string().optional(),
  supplies: z.string().optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  post_op_notes: z.string().optional(),
  recovery_instructions: z.string().optional(),
  follow_up_date: z.preprocess(
    v => v === '' ? undefined : v,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  ),
  prescriptions: z.array(prescriptionSchema).default([]),
})
export type ConcludeSurgeryValues = z.infer<typeof concludeSurgerySchema>
