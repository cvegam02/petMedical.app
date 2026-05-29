import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CalendarView } from '@/components/appointments/CalendarView'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

vi.mock('react-big-calendar', () => ({
  Calendar: ({ events }: any) => (
    <div data-testid="rbc-calendar">
      {events.map((e: any) => (
        <div key={e.resource.id} data-testid="rbc-event">{e.title}</div>
      ))}
    </div>
  ),
  dateFnsLocalizer: vi.fn(() => ({})),
  Views: { WEEK: 'week', MONTH: 'month' },
}))

const businessHours: BusinessHoursConfig = {
  days: [1, 2, 3, 4, 5, 6],
  start: '09:00',
  end: '18:00',
  slot_interval: 30,
}

describe('CalendarView', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as any)
  })

  it('renderiza el calendario', () => {
    render(<CalendarView businessHours={businessHours} />)
    expect(screen.getByTestId('rbc-calendar')).toBeInTheDocument()
  })

  it('llama al API con rango de fechas al montar', async () => {
    render(<CalendarView businessHours={businessHours} />)
    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/appointments?from='),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })
  })
})
