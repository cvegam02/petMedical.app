import { z } from 'zod'

export const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Nombre es requerido').optional(),
  phone: z.string().optional(),
  professional_license: z.string().optional(),
  professional_address: z.string().optional(),
})

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>
