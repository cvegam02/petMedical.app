'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewAppointmentModal } from './NewAppointmentModal'

interface NewAppointmentButtonProps {
  team: { id: string; full_name: string }[]
  size?: 'sm' | 'default'
}

export function NewAppointmentButton({ team, size = 'sm' }: NewAppointmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Button size={size} onClick={() => setIsOpen(true)}>
        <Plus size={14} />
        Nueva cita
      </Button>
      <NewAppointmentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        team={team}
      />
    </>
  )
}
