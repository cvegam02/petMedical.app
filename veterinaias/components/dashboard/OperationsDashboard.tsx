'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'
import { MetricsStrip } from './MetricsStrip'
import { AlertBanner, type Alert } from './AlertBanner'
import { ActiveServicesBand, type ActiveServiceItem } from './ActiveServicesBand'
import { AppointmentChipsStrip } from './AppointmentChipsStrip'
import type { DashboardAppointment } from './DashboardAppointmentCard'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

interface Metrics {
  inService: number
  hotelActive: number
  total: number
  pendingConfirm: number
  alerts: number
}

interface Props {
  date: Date
  appointments: DashboardAppointment[]
  metrics: Metrics
  alerts: Alert[]
  initialActiveServices: ActiveServiceItem[]
  team: { id: string; full_name: string }[]
  businessHours: BusinessHoursConfig
}

export function OperationsDashboard({
  date,
  appointments,
  metrics,
  alerts,
  initialActiveServices,
  team,
  businessHours,
}: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  const dateLabel = date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const dateFormatted = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#73808C] mb-1">Agenda</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#161D24]">{dateFormatted}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-[10px] border border-[#E7EBEF] bg-[#F3F8FC] px-4 py-2 text-sm font-semibold text-[#0F4C81] hover:bg-[#DCF8EB] hover:text-[#1D865C] transition-colors"
          >
            + Nueva cita
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/servicios/consulta/new')}
            className="rounded-[10px] bg-[#35C48B] px-4 py-2 text-sm font-bold text-white hover:bg-[#27A673] transition-colors"
          >
            Atender ahora
          </button>
        </div>
      </div>

      {/* Métricas */}
      <MetricsStrip
        inService={metrics.inService}
        hotelActive={metrics.hotelActive}
        total={metrics.total}
        pendingConfirm={metrics.pendingConfirm}
        alerts={metrics.alerts}
      />

      {/* Alertas (condicional) */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <AlertBanner key={i} alert={alert} />
          ))}
        </div>
      )}

      {/* Servicios activos */}
      <ActiveServicesBand
        initial={initialActiveServices}
        onChanged={() => router.refresh()}
      />

      {/* Próximas citas */}
      <AppointmentChipsStrip appointments={appointments} />

      <NewAppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        team={team}
        businessHours={businessHours}
      />
    </div>
  )
}
