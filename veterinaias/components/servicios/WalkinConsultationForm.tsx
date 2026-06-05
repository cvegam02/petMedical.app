'use client'
import { useRouter } from 'next/navigation'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

interface Props {
  team: { id: string; full_name: string }[]
  businessHours: BusinessHoursConfig
}

export function WalkinConsultationForm({ team, businessHours }: Props) {
  const router = useRouter()

  function handleClose() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/dashboard/servicios/consulta')
    }
  }

  return (
    <NewAppointmentModal
      isOpen={true}
      onClose={handleClose}
      team={team}
      businessHours={businessHours}
      initialAppointmentType="consultation"
    />
  )
}
