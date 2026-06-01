import type { ServiceType } from '@/lib/types/database'

/**
 * Visual config per service type — single source of truth for color coding
 * across the calendar, popover, and dashboard cards.
 */
export const SERVICE_TYPE_CONFIG: Record<string, {
  label: string
  /** chip background/text/border classes */
  chip: string
  /** left accent bar background class */
  bar: string
  /** accent text color class */
  accent: string
}> = {
  consultation: {
    label: 'Médico',
    chip: 'bg-primary/10 text-primary border-primary/20',
    bar: 'bg-primary',
    accent: 'text-primary',
  },
  grooming: {
    label: 'Estético',
    chip: 'bg-violet-50 text-violet-700 border-violet-200',
    bar: 'bg-violet-500',
    accent: 'text-violet-600',
  },
}

export function serviceTypeConfig(type: ServiceType | undefined | null) {
  return SERVICE_TYPE_CONFIG[type ?? 'consultation'] ?? SERVICE_TYPE_CONFIG.consultation
}
