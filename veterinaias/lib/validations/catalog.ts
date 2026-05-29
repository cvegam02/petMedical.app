import { z } from 'zod'

export const vaccineCatalogSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  manufacturer: z.string().optional(),
  lot_number: z.string().optional(),
  stock_quantity: z.preprocess(
    v => (v === '' || v === null || v === undefined ? 0 : Number(v)),
    z.number().int().min(0, 'Stock no puede ser negativo')
  ),
  low_stock_threshold: z.preprocess(
    v => (v === '' || v === null || v === undefined ? 5 : Number(v)),
    z.number().int().min(1, 'Umbral mínimo es 1')
  ),
  notes: z.string().optional(),
})

export const updateVaccineCatalogSchema = vaccineCatalogSchema.partial().extend({
  active: z.boolean().optional(),
  stock_quantity: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(0).optional()
  ),
})

export const medicationCatalogSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  active_ingredient: z.string().optional(),
  description: z.string().optional(),
  dose_per_kg: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive('Debe ser mayor a 0').optional()
  ),
  dose_unit: z.string().optional(),
  concentration: z.string().optional(),
  default_route: z.string().optional(),
  notes: z.string().optional(),
})

export const updateMedicationCatalogSchema = medicationCatalogSchema.partial().extend({
  active: z.boolean().optional(),
})

export type VaccineCatalogFormValues = z.infer<typeof vaccineCatalogSchema>
export type MedicationCatalogFormValues = z.infer<typeof medicationCatalogSchema>
