import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email es requerido').email('Email invalido'),
  password: z.string().min(1, 'Contrasena es requerida'),
})

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().min(1, 'Email es requerido').email('Email invalido'),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
