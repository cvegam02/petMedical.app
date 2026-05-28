export interface BusinessHoursConfig {
  days: number[]       // 0=Sunday … 6=Saturday
  start: string        // "HH:mm"
  end: string          // "HH:mm"
  slot_interval: number // minutes between slots
}

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  days: [1, 2, 3, 4, 5, 6],
  start: '09:00',
  end: '18:00',
  slot_interval: 30,
}

export function generateTimeSlots(config: BusinessHoursConfig, date: Date): string[] {
  const [startH, startM] = config.start.split(':').map(Number)
  const [endH, endM] = config.end.split(':').map(Number)

  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1

  const slots: string[] = []
  for (let m = startMinutes; m < endMinutes; m += config.slot_interval) {
    if (isToday && m <= currentMinutes) continue
    const h = Math.floor(m / 60)
    const min = m % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }
  return slots
}

export function combineDateAndTime(date: Date, timeSlot: string): Date {
  const [h, m] = timeSlot.split(':').map(Number)
  const result = new Date(date)
  result.setHours(h, m, 0, 0)
  return result
}
