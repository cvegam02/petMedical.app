import { z } from 'zod'

export const ownerSchema = z.object({
  full_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().min(7, 'Teléfono debe tener al menos 7 caracteres'),
  address: z.string().optional(),
})

export const updateOwnerSchema = ownerSchema.partial()

export type OwnerFormValues = z.infer<typeof ownerSchema>
