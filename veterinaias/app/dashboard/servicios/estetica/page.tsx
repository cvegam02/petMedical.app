// app/dashboard/servicios/estetica/page.tsx
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
    <div className="max-w-5xl mx-auto pb-10">
      <div className="space-y-1 mb-8">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Servicios</p>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Scissors size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
            Estética
          </h1>
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
