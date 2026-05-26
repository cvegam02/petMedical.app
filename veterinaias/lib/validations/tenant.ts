import { z } from 'zod'

export const tenantSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  type: z.enum(['individual', 'enterprise'], {
    error: () => ({ message: 'Tipo debe ser individual o enterprise' }),
  }),
})

export type TenantInput = z.infer<typeof tenantSchema>

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
