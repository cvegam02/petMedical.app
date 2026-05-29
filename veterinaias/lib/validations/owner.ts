import { z } from 'zod'

export const ownerSchema = z.object({
  full_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().refine(val => val.replace(/\D/g, '').length === 10, {
    message: 'El teléfono debe tener exactamente 10 dígitos'
  }),
  address: z.string().optional(),
})

export const updateOwnerSchema = ownerSchema.partial()

export type OwnerFormValues = z.infer<typeof ownerSchema>
