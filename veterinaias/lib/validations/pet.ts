import { z } from 'zod'

export const petSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  owner_id: z.string().uuid('Dueño es requerido'),
  species_id: z.string().uuid('Especie es requerida'),
  breed: z.string().optional(),
  sex: z.enum(['male', 'female', 'unknown']),
  date_of_birth: z.preprocess(
    v => (v === '' ? undefined : v),
    z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe tener formato YYYY-MM-DD')
      .refine(s => !isNaN(new Date(s).getTime()), 'Fecha inválida')
      .optional()
  ),
  color: z.string().optional(),
  microchip: z.string().optional(),
  notes: z.string().optional(),
  sterilized: z.boolean().optional(),
  habitat: z.string().optional(),
  feeding: z.string().optional(),
  cohabitation: z.boolean().optional(),
  cohabitation_details: z.string().optional(),
})

export const updatePetSchema = petSchema.omit({ owner_id: true }).partial()

export type PetFormValues = z.infer<typeof petSchema>
