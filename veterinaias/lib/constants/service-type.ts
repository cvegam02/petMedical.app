import { Stethoscope, Scissors, type LucideIcon } from 'lucide-react'
import type { ServiceType } from '@/lib/types/database'

/**
 * Service type is differentiated ACROSS THE APP by ICON ONLY (no color).
 * Color is reserved for appointment STATUS — see APPOINTMENT_STATUS_CONFIG.
 * This is the single source of truth for the per-service icon + label.
 */
export const SERVICE_TYPE_CONFIG: Record<string, { label: string; Icon: LucideIcon }> = {
  consultation: { label: 'Médico', Icon: Stethoscope },
  grooming: { label: 'Estético', Icon: Scissors },
}

export function serviceTypeConfig(type: ServiceType | undefined | null) {
  return SERVICE_TYPE_CONFIG[type ?? 'consultation'] ?? SERVICE_TYPE_CONFIG.consultation
}
