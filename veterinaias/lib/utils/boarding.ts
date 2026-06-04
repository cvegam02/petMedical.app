export function isCheckoutOverdue(
  expectedCheckOut: string | null,
  startedAt: string | null,
  endedAt: string | null,
  now: number = Date.now(),
): boolean {
  if (endedAt || !startedAt || !expectedCheckOut) return false
  return now > new Date(expectedCheckOut).getTime()
}

export function isCheckoutToday(expectedCheckOut: string | null, now: number = Date.now()): boolean {
  if (!expectedCheckOut) return false
  const d = new Date(expectedCheckOut)
  const n = new Date(now)
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

/** Fechas (YYYY-MM-DD) de la estancia, de la entrada al fin del rango, inclusivo. */
export function stayDays(startedAt: string | null, endDateMs: number): string[] {
  if (!startedAt) return []
  const start = new Date(startedAt); start.setHours(0, 0, 0, 0)
  const end = new Date(endDateMs); end.setHours(0, 0, 0, 0)
  const out: string[] = []
  const pad = (n: number) => String(n).padStart(2, '0')
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const d = new Date(t)
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  }
  return out
}

function toLocalDateStr(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function calendarDiff(fromDateStr: string, toDateStr: string): number {
  return Math.round(
    (new Date(toDateStr + 'T12:00:00').getTime() - new Date(fromDateStr + 'T12:00:00').getTime()) / 86400000
  )
}

export function stayDayLabel(startedAt: string | null, expectedCheckOut: string | null): string {
  if (!startedAt) return '—'
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const startDate = toLocalDateStr(startedAt)
  const day = Math.max(1, calendarDiff(startDate, todayDate) + 1)
  if (!expectedCheckOut) return `Día ${day}`
  const total = Math.max(1, calendarDiff(startDate, toLocalDateStr(expectedCheckOut)) + 1)
  return `Día ${day} de ${total}`
}

export function remainingDaysLabel(
  expectedCheckOut: string | null,
  endedAt: string | null,
  now: number = Date.now(),
): string | null {
  if (endedAt || !expectedCheckOut) return null
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const checkout = new Date(
    expectedCheckOut.length === 10 ? expectedCheckOut + 'T12:00:00' : expectedCheckOut
  )
  checkout.setHours(0, 0, 0, 0)
  const diff = Math.round((checkout.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return null
  if (diff === 0) return 'Sale hoy'
  return `${diff} día${diff === 1 ? '' : 's'} restante${diff === 1 ? '' : 's'}`
}
