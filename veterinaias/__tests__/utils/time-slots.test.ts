import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateTimeSlots, combineDateAndTime, DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'

const CONFIG = DEFAULT_BUSINESS_HOURS // Mon-Sat, 09:00-18:00, 30 min

afterEach(() => { vi.useRealTimers() })

describe('generateTimeSlots', () => {
  it('generates slots from start to end (exclusive) for a future date', () => {
    const date = new Date(2026, 5, 5) // June 5 2026 — Friday, not today
    const slots = generateTimeSlots(CONFIG, date)
    expect(slots[0]).toBe('09:00')
    expect(slots[slots.length - 1]).toBe('17:30')
    // (18:00 - 09:00) / 30 min = 18 slots
    expect(slots.length).toBe(18)
  })

  it('filters past slots when the date is today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 1, 10, 15)) // June 1 2026, 10:15
    const today = new Date(2026, 5, 1)
    const slots = generateTimeSlots(CONFIG, today)
    // 09:00, 09:30, 10:00 have passed (10:15 > 10:00); 10:30 is first available
    expect(slots[0]).toBe('10:30')
  })

  it('respects custom slot_interval', () => {
    const config = { ...CONFIG, slot_interval: 15 }
    const date = new Date(2026, 5, 5)
    const slots = generateTimeSlots(config, date)
    expect(slots[0]).toBe('09:00')
    expect(slots[1]).toBe('09:15')
    // (18:00 - 09:00) / 15 min = 36 slots
    expect(slots.length).toBe(36)
  })

  it('returns empty array when all slots have passed today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 1, 18, 0)) // 18:00 — all done
    const today = new Date(2026, 5, 1)
    const slots = generateTimeSlots(CONFIG, today)
    expect(slots).toEqual([])
  })
})

describe('combineDateAndTime', () => {
  it('sets hours and minutes on the given date without mutating it', () => {
    const date = new Date(2026, 5, 5, 0, 0, 0, 0)
    const original = date.getTime()
    const result = combineDateAndTime(date, '14:30')
    expect(result.getHours()).toBe(14)
    expect(result.getMinutes()).toBe(30)
    expect(result.getSeconds()).toBe(0)
    expect(result.getDate()).toBe(5)
    expect(date.getTime()).toBe(original) // original is not mutated
  })
})
