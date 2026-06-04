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
export { BoardingPanel } from './BoardingPanel'
export { SurgeryPanel } from './SurgeryPanel'
export { HospitalizationPanel } from './HospitalizationPanel'

import { ConsultationPanel } from './ConsultationPanel'
import { GroomingPanel } from './GroomingPanel'
import { BoardingPanel } from './BoardingPanel'
import { SurgeryPanel } from './SurgeryPanel'
import { HospitalizationPanel } from './HospitalizationPanel'

export const SERVICE_PANELS: Partial<Record<ServiceType, ComponentType<PanelProps>>> = {
  consultation: ConsultationPanel,
  grooming: GroomingPanel,
  boarding: BoardingPanel,
  surgery: SurgeryPanel,
  hospitalization: HospitalizationPanel,
}
