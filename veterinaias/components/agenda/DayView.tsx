'use client'
import { useMemo } from 'react'
import { parseISO } from 'date-fns'

export interface AgendaAppointment {
  id: string
  scheduled_at: string
  duration_minutes: number | null
  service_type: 'consultation' | 'grooming' | 'boarding' | 'surgery'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  pet: { id: string; name: string } | null
  owner: { id: string; full_name: string } | null
}

interface DayViewProps {
  date: Date
  appointments: AgendaAppointment[]
  onSlotClick: (date: Date, hour: number) => void
  onAppointmentClick: (appt: AgendaAppointment) => void
}

const SERVICE_LABELS: Record<AgendaAppointment['service_type'], string> = {
  consultation: 'Consulta',
  grooming: 'Estética',
  boarding: 'Hotel',
  surgery: 'Cirugía',
}

const STATUS_COLORS: Record<AgendaAppointment['status'], string> = {
  scheduled: 'border-amber-300 bg-amber-50 text-amber-800',
  confirmed: 'border-blue-300 bg-blue-50 text-blue-800',
  completed: 'border-green-300 bg-green-50 text-green-800',
  cancelled: 'border-red-200 bg-red-50 text-red-700 line-through',
  no_show: 'border-gray-300 bg-gray-50 text-gray-600 line-through',
}

function AppointmentChip({
  appt,
  onClick,
}: {
  appt: AgendaAppointment
  onClick: React.MouseEventHandler
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${appt.pet?.name ?? 'Sin mascota'} — ${SERVICE_LABELS[appt.service_type]} — ${appt.owner?.full_name ?? 'Sin dueño'}`}
      className={`rounded-md border px-2 py-1 text-left text-xs font-medium transition-shadow hover:shadow-sm ${STATUS_COLORS[appt.status] ?? ''}`}
    >
      <div className="font-semibold">{appt.pet?.name ?? '—'}</div>
      <div className="opacity-75">
        {SERVICE_LABELS[appt.service_type]} · {appt.owner?.full_name}
      </div>
    </button>
  )
}

export function DayView({
  date,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: DayViewProps) {
  const hours = useMemo(() => Array.from({ length: 13 }, (_, i) => i + 7), []) // 07:00–19:00

  const appointmentsByHour = useMemo(() => {
    const grouped: Record<number, AgendaAppointment[]> = {}
    appointments.forEach(a => {
      const h = parseISO(a.scheduled_at).getHours()
      grouped[h] ??= []
      grouped[h].push(a)
    })
    return grouped
  }, [appointments])

  return (
    <div className="flex flex-col divide-y divide-border overflow-y-auto">
      {hours.map(hour => {
        const slotAppts = appointmentsByHour[hour] ?? []

        return (
          <button
            key={hour}
            type="button"
            onClick={() => onSlotClick(date, hour)}
            aria-label={`${hour.toString().padStart(2, '0')}:00 — agregar cita`}
            className="group relative flex w-full min-h-[64px] cursor-pointer gap-3 px-4 py-2 text-left hover:bg-muted/40"
          >
            <span className="w-12 shrink-0 pt-1 text-xs text-muted-foreground">
              {hour.toString().padStart(2, '0')}:00
            </span>
            <div className="flex flex-1 flex-wrap gap-2">
              {slotAppts.map(appt => (
                <AppointmentChip
                  key={appt.id}
                  appt={appt}
                  onClick={e => {
                    e.stopPropagation()
                    onAppointmentClick(appt)
                  }}
                />
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}
