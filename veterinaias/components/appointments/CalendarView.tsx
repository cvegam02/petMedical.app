'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import type { EventProps } from 'react-big-calendar'
import {
  format, parse, startOfWeek, endOfWeek, getDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import { AppointmentPopover, type AppointmentResource } from './AppointmentPopover'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { es },
})

const STATUS_DOT: Record<string, string> = {
  scheduled: 'bg-muted-foreground/40',
  confirmed:  'bg-primary',
  completed:  'bg-primary/70',
  cancelled:  'bg-destructive',
  no_show:    'bg-orange-400',
}

interface CalendarEvent {
  title: string
  start: Date
  end: Date
  resource: AppointmentResource
}

function EventComponent({ event }: EventProps<CalendarEvent>) {
  return (
    <AppointmentPopover appointment={event.resource}>
      <button
        className="w-full h-full text-left flex items-center gap-1 px-1 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[event.resource.status] ?? 'bg-muted-foreground/40'}`} />
        <span className="text-[11px] truncate leading-tight">
          {event.resource.pet?.name ?? '—'}
          {event.resource.pet?.species ? ` · ${event.resource.pet.species.name}` : ''}
        </span>
      </button>
    </AppointmentPopover>
  )
}

function parseHHMM(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return new Date(1970, 0, 1, hours, minutes, 0, 0)
}

interface CalendarViewProps {
  businessHours: BusinessHoursConfig
}

export function CalendarView({ businessHours }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchRange = useCallback(async (from: Date, to: Date) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const url = `/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) {
        setError('No se pudieron cargar las citas.')
        return
      }
      const json = await res.json()
      const apts: AppointmentResource[] = json.data ?? []
      setEvents(
        apts.map(apt => {
          const start = new Date(apt.scheduled_at)
          const end = new Date(start.getTime() + apt.duration_minutes * 60_000)
          return { title: apt.pet?.name ?? '—', start, end, resource: apt }
        })
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('No se pudieron cargar las citas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const now = new Date()
    fetchRange(
      startOfWeek(now, { weekStartsOn: 1 }),
      endOfWeek(now, { weekStartsOn: 1 })
    )
    return () => { abortRef.current?.abort() }
  }, [fetchRange])

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (Array.isArray(range)) {
        fetchRange(range[0], range[range.length - 1])
      } else {
        fetchRange(range.start, range.end)
      }
    },
    [fetchRange]
  )

  return (
    <div className="relative">
      {loading && (
        <div className="absolute top-2 right-2 z-10 text-xs text-muted-foreground animate-pulse">
          Cargando...
        </div>
      )}
      {error && (
        <div className="mb-3 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="rbc-wrapper">
        <Calendar<CalendarEvent>
          localizer={localizer}
          events={events}
          defaultView={Views.WEEK}
          views={[Views.WEEK, Views.MONTH]}
          onRangeChange={handleRangeChange}
          min={parseHHMM(businessHours.start)}
          max={parseHHMM(businessHours.end)}
          culture="es"
          components={{ event: EventComponent }}
          selectable={false}
          style={{ height: 600 }}
          messages={{
            week: 'Semana',
            month: 'Mes',
            today: 'Hoy',
            previous: '‹',
            next: '›',
            noEventsInRange: 'Sin citas en este período.',
          }}
        />
      </div>
    </div>
  )
}
