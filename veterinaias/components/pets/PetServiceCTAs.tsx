'use client'
import { useState } from 'react'
import { Scissors, BedDouble } from 'lucide-react'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

interface TeamMember { id: string; full_name: string }

interface PetServiceCTAsProps {
  petId: string
  petName: string
  ownerId: string
  ownerName: string
  team: TeamMember[]
  businessHours?: BusinessHoursConfig
}

type ServiceType = 'consultation' | 'grooming' | 'boarding'

const SERVICES: { type: ServiceType; label: string; icon: typeof Scissors; description: string }[] = [
  {
    type: 'grooming',
    label: 'Estética',
    icon: Scissors,
    description: 'Baño, corte y cuidado',
  },
  {
    type: 'boarding',
    label: 'Hotel',
    icon: BedDouble,
    description: 'Estadía y hospedaje',
  },
]

export function PetServiceCTAs({ petId, petName, ownerId, ownerName, team, businessHours }: PetServiceCTAsProps) {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ServiceType>('grooming')

  function openFor(type: ServiceType) {
    setSelectedType(type)
    setOpen(true)
  }

  return (
    <>
      <div className="flex items-center gap-2.5 mb-6">
        <p className="text-[10px] font-bold text-foreground/35 uppercase tracking-[0.14em] shrink-0">Servicios</p>
        <div className="flex items-center gap-2">
          {SERVICES.map(({ type, label, icon: Icon, description }) => (
            <button
              key={type}
              onClick={() => openFor(type)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all text-left group"
            >
              <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                <Icon size={14} strokeWidth={1.75} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground leading-none">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <NewAppointmentModal
        isOpen={open}
        onClose={() => setOpen(false)}
        team={team}
        businessHours={businessHours}
        initialAppointmentType={selectedType as 'consultation' | 'grooming' | 'boarding' | 'cirugia'}
        initialPet={{ petId, petName, ownerId, ownerName }}
      />
    </>
  )
}
