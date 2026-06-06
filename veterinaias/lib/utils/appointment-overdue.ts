export const OVERDUE_GRACE_MINUTES = 30

/**
 * An appointment is "overdue" when it is still scheduled/confirmed and its time window
 * (scheduled_at + duration + grace) has fully passed. Derived; never stored.
 */
export function isOverdue(
  scheduledAt: string,
  durationMinutes: number | null | undefined,
  status: string,
  now: number = Date.now(),
): boolean {
  if (status !== 'scheduled' && status !== 'confirmed') return false
  const endMs =
    new Date(scheduledAt).getTime() +
    (durationMinutes ?? 0) * 60_000 +
    OVERDUE_GRACE_MINUTES * 60_000
  return now > endMs
}
