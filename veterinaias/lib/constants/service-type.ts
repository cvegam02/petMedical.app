import { Stethoscope, Scissors, BedDouble, Syringe, HeartPulse, type LucideIcon } from 'lucide-react'
import type { ServiceType } from '@/lib/types/database'

export const SERVICE_TYPE_CONFIG: Record<string, { label: string; Icon: LucideIcon }> = {
  consultation: { label: 'Médico', Icon: Stethoscope },
  grooming: { label: 'Estético', Icon: Scissors },
  boarding: { label: 'Hotel', Icon: BedDouble },
  surgery: { label: 'Cirugía', Icon: Syringe },
  hospitalization: { label: 'Hospitalización', Icon: HeartPulse },
}

export function serviceTypeConfig(type: ServiceType | undefined | null) {
  return SERVICE_TYPE_CONFIG[type ?? 'consultation'] ?? SERVICE_TYPE_CONFIG.consultation
}
