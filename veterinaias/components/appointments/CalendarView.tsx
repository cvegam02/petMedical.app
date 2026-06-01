'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import type { EventProps, View } from 'react-big-calendar'
import {
  format, parse, startOfWeek, endOfWeek, getDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Scissors } from 'lucide-react'
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
  const isGrooming = (event.resource.service_type ?? 'consultation') === 'grooming'
  return (
    <AppointmentPopover appointment={event.resource}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[event.resource.status] ?? 'bg-muted-foreground/40'}`} />
      {isGrooming && <Scissors size={9} strokeWidth={2.25} className="shrink-0 opacity-70" />}
      <span className="text-[11px] truncate leading-tight">
        {event.resource.pet?.name ?? '—'}
        {event.resource.pet?.species ? ` · ${event.resource.pet.species.name}` : ''}
      </span>
    </AppointmentPopover>
  )
}

// Color the event tile by service type (consultation = primary, grooming = violet)
// and dim terminal/cancelled states.
function eventPropGetter(event: CalendarEvent) {
  const isGrooming = (event.resource.service_type ?? 'consultation') === 'grooming'
  const isDimmed = event.resource.status === 'cancelled' || event.resource.status === 'no_show'
  const classes = [
    isGrooming ? 'rbc-event--grooming' : 'rbc-event--consultation',
    isDimmed ? 'rbc-event--dimmed' : '',
  ].filter(Boolean).join(' ')
  return { className: classes }
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
  const [currentView, setCurrentView] = useState<View>(Views.WEEK)
  const [currentDate, setCurrentDate] = useState(new Date())
  const abortRef = useRef<AbortController | null>(null)
  const lastRangeRef = useRef<{ from: Date; to: Date } | null>(null)

  const components = useMemo(() => ({ event: EventComponent }), [])

  const fetchRange = useCallback(async (from: Date, to: Date) => {
    lastRangeRef.current = { from, to }
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
      // Only clear loading if this controller is still the active one.
      // If aborted, abortRef.current is already the newer controller.
      if (abortRef.current === controller) setLoading(false)
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

  // Re-fetch when a new appointment is created elsewhere on the page
  useEffect(() => {
    function onCreated() {
      const r = lastRangeRef.current
      if (r) fetchRange(r.from, r.to)
    }
    window.addEventListener('appointment:created', onCreated)
    return () => window.removeEventListener('appointment:created', onCreated)
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
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-sm">
          <div className="rbc-loading-shimmer absolute inset-0" />
          <div className="rbc-loading-scanline" />
        </div>
      )}
      {error && (
        <div className="mb-3 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className={`rbc-wrapper transition-opacity duration-500 ${loading ? 'opacity-60' : 'opacity-100'}`}>
        <Calendar<CalendarEvent>
          localizer={localizer}
          events={events}
          date={currentDate}
          onNavigate={setCurrentDate}
          view={currentView}
          onView={setCurrentView}
          views={[Views.WEEK, Views.MONTH]}
          onRangeChange={handleRangeChange}
          min={parseHHMM(businessHours.start)}
          max={parseHHMM(businessHours.end)}
          culture="es"
          components={components}
          eventPropGetter={eventPropGetter}
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
