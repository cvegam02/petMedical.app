'use client'
import { useState } from 'react'
import { Syringe, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VaccinationsModal } from './VaccinationsModal'
import { DewormingsModal } from './DewormingsModal'

interface PetCartillaButtonsProps {
  petId: string
  petName: string
}

export function PetCartillaButtons({ petId, petName: _ }: PetCartillaButtonsProps) {
  const [vaccinationsOpen, setVaccinationsOpen] = useState(false)
  const [dewormingsOpen, setDewormingsOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline" size="sm"
          onClick={() => setVaccinationsOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Syringe size={13} />Vacunas
        </Button>
        <Button
          variant="outline" size="sm"
          onClick={() => setDewormingsOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Bug size={13} />Desparasitaciones
        </Button>
      </div>

      <VaccinationsModal petId={petId} open={vaccinationsOpen} onOpenChange={setVaccinationsOpen} />
      <DewormingsModal petId={petId} open={dewormingsOpen} onOpenChange={setDewormingsOpen} />
    </>
  )
}
