'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewAppointmentModal, type NewAppointmentModalProps } from './NewAppointmentModal'
import { BusinessHoursConfig, DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'

interface NewAppointmentButtonProps {
  team: { id: string; full_name: string }[]
  businessHours?: BusinessHoursConfig
  size?: 'sm' | 'default'
  label?: string
  initialAppointmentType?: NewAppointmentModalProps['initialAppointmentType']
}

export function NewAppointmentButton({ team, businessHours = DEFAULT_BUSINESS_HOURS, size = 'sm', label, initialAppointmentType }: NewAppointmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Button size={size} onClick={() => setIsOpen(true)}>
        <Plus size={14} />
        {label ?? 'Nueva cita'}
      </Button>
      <NewAppointmentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        team={team}
        businessHours={businessHours}
        initialAppointmentType={initialAppointmentType}
      />
    </>
  )
}
