'use client'
import { useState } from 'react'
import { Syringe, Bug, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VaccinationsModal } from './VaccinationsModal'
import { DewormingsModal } from './DewormingsModal'
import { GroomingHistoryModal } from '@/components/servicios/GroomingHistoryModal'

interface PetCartillaButtonsProps {
  petId: string
  petName: string
}

export function PetCartillaButtons({ petId, petName }: PetCartillaButtonsProps) {
  const [vaccinationsOpen, setVaccinationsOpen] = useState(false)
  const [dewormingsOpen, setDewormingsOpen] = useState(false)
  const [groomingOpen, setGroomingOpen] = useState(false)

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
        <Button
          variant="outline" size="sm"
          onClick={() => setGroomingOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Scissors size={13} />Estética
        </Button>
      </div>

      <VaccinationsModal petId={petId} open={vaccinationsOpen} onOpenChange={setVaccinationsOpen} />
      <DewormingsModal petId={petId} open={dewormingsOpen} onOpenChange={setDewormingsOpen} />
      <GroomingHistoryModal
        petId={petId}
        petName={petName}
        open={groomingOpen}
        onOpenChange={setGroomingOpen}
      />
    </>
  )
}
