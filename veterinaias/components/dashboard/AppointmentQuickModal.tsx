'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { NextAppointmentCard } from './NextAppointmentCard'
import { DashboardAppointmentCard } from './DashboardAppointmentCard'
import { AppointmentDetailDialog } from '@/components/appointments/AppointmentDetailDialog'
import type { DashboardAppointment } from './DashboardAppointmentCard'
export type { DashboardAppointment }

interface Props {
  nextAppointment?: DashboardAppointment | null
  appointments: DashboardAppointment[]
}

export function AppointmentQuickModal({ nextAppointment, appointments }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<DashboardAppointment | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  async function transition(newStatus: string) {
    if (!selected) return
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/appointments/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      setSelected(null)
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className="space-y-3">
        {nextAppointment && <NextAppointmentCard appointment={nextAppointment} onSelect={setSelected} />}
        {appointments.length > 0 && (
          <div className="space-y-2">
            {appointments.map(apt => (
              <DashboardAppointmentCard key={apt.id} appointment={apt} onSelect={setSelected} />
            ))}
          </div>
        )}
      </div>

      <AppointmentDetailDialog
        open={selected !== null}
        onOpenChange={(open) => { if (!open) setSelected(null) }}
        appointment={selected}
        onTransition={transition}
        loadingStatus={loading}
      />
    </>
  )
}
