'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'
import { DayView, type AgendaAppointment } from './DayView'
import { AppointmentPanel } from './AppointmentPanel'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

interface Metrics {
  total: number
  inService: number
  hotelActive: number
  pendingConfirm: number
}

interface AgendaScreenProps {
  date: Date
  appointments: AgendaAppointment[]
  metrics: Metrics
  team: { id: string; full_name: string }[]
  businessHours: BusinessHoursConfig
}

export function AgendaScreen({ date, appointments, metrics, team, businessHours }: AgendaScreenProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<AgendaAppointment | null>(null)

  function handleAtenderAhora() {
    router.push('/dashboard/servicios/consulta/new')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Metrics strip */}
      <div className="flex items-center gap-6 border-b px-6 py-3 text-sm">
        <span><strong>{metrics.total}</strong> citas hoy</span>
        <span><strong>{metrics.inService}</strong> en curso</span>
        <span><strong>{metrics.hotelActive}</strong> hotel activo</span>
        {metrics.pendingConfirm > 0 && (
          <span className="text-amber-600"><strong>{metrics.pendingConfirm}</strong> sin confirmar</span>
        )}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
            + Nueva cita
          </Button>
          <Button size="sm" onClick={handleAtenderAhora}>
            Atender Ahora
          </Button>
        </div>
      </div>

      {/* Calendar + Panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <DayView
            date={date}
            appointments={appointments}
            onSlotClick={(_date, _hour) => setModalOpen(true)}
            onAppointmentClick={setSelectedAppt}
          />
        </div>

        {selectedAppt && (
          <div className="w-72 shrink-0 border-l">
            <AppointmentPanel
              appointment={selectedAppt}
              onClose={() => setSelectedAppt(null)}
            />
          </div>
        )}
      </div>

      <NewAppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        team={team}
        businessHours={businessHours}
      />
    </div>
  )
}
