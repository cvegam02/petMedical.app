'use client'
import { useState } from 'react'
import { Scissors } from 'lucide-react'
import { GroomingSessionsTable } from '@/components/servicios/GroomingSessionsTable'
import { GroomingSessionModal } from '@/components/servicios/GroomingSessionModal'

export default function EsteticaPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    setModalOpen(false)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-[1.5px] bg-secondary-foreground/20 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-secondary-foreground uppercase tracking-[0.2em]">Servicios</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Scissors size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
            Estética
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Sesiones de baño, corte y arreglo para los pacientes del consultorio.
          </p>
        </div>
      </div>

      <GroomingSessionsTable
        key={refreshKey}
        onNew={() => setModalOpen(true)}
      />

      <GroomingSessionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
