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

const SERVICE_DETAIL_ROUTES: Record<string, string> = {
  consultation: '/dashboard/servicios/consulta',
  grooming: '/dashboard/servicios/estetica',
  boarding: '/dashboard/servicios/hotel',
  surgery: '/dashboard/servicios/cirugia',
  hospitalization: '/dashboard/servicios/hospitalizacion',
}

export function serviceDetailUrl(type: ServiceType | undefined | null, appointmentId: string) {
  const base = SERVICE_DETAIL_ROUTES[type ?? 'consultation'] ?? SERVICE_DETAIL_ROUTES.consultation
  return `${base}/${appointmentId}`
}
