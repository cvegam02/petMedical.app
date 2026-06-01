import type { ComponentType } from 'react'
import type { ServiceType } from '@/lib/types/database'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

export interface PanelProps {
  appointment: DashboardAppointment
  onClose: () => void
  onRefresh: () => void
}

export { ConsultationPanel } from './ConsultationPanel'
export { GroomingPanel } from './GroomingPanel'

import { ConsultationPanel } from './ConsultationPanel'
import { GroomingPanel } from './GroomingPanel'

export const SERVICE_PANELS: Partial<Record<ServiceType, ComponentType<PanelProps>>> = {
  consultation: ConsultationPanel,
  grooming: GroomingPanel,
  // surgery, hospitalization, boarding → planes 9-11
}
