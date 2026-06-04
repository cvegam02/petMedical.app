'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, BedDouble } from 'lucide-react'
import { isCheckoutOverdue, stayDayLabel, remainingDaysLabel } from '@/lib/utils/boarding'

interface StayRow {
  id: string
  started_at: string | null
  ended_at: string | null
  expected_check_out: string | null
  today_note: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string } | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short',
  })
}

export function ActiveBoardingStays() {
  const router = useRouter()
  const [stays, setStays] = useState<StayRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/servicios/hotel')
      const json = await res.json()
      const all: StayRow[] = json.data ?? []
      setStays(all.filter(s => s.started_at && !s.ended_at))
    } catch {
      setStays([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const refetch = () => load()
    window.addEventListener('hotel:changed', refetch)
    return () => window.removeEventListener('hotel:changed', refetch)
  }, [])

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.1em]">En hospedaje</p>
        {!loading && stays.length > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {stays.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : stays.length === 0 ? (
        <div className="text-center py-12 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <BedDouble size={24} strokeWidth={1.5} className="mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-foreground">Sin huéspedes activos</p>
          <p className="text-xs text-muted-foreground mt-1">
            Haz check-in desde la agenda o el dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {stays.map(s => {
            const overdue = isCheckoutOverdue(s.expected_check_out, s.started_at, s.ended_at)
            const remaining = remainingDaysLabel(s.expected_check_out, s.ended_at)
            const subtitle = [s.pet?.species?.name, s.owner?.full_name].filter(Boolean).join(' · ')
            return (
              <div
                key={s.id}
                onClick={() => router.push(`/dashboard/servicios/hotel/${s.id}`)}
                className="rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors cursor-pointer p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {stayDayLabel(s.started_at, s.expected_check_out)}
                      </span>
                      {!overdue && remaining && (
                        <span className="text-xs px-2 py-0.5 rounded-full border text-muted-foreground border-border/60">
                          {remaining}
                        </span>
                      )}
                      {overdue && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-orange-600 bg-orange-50 border-orange-200">
                          Salida vencida
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-foreground">{s.pet?.name ?? '—'}</p>
                    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                    <div className="flex items-baseline gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>{formatDate(s.started_at)} → {formatDate(s.expected_check_out)}</span>
                      {s.today_note && (
                        <span className="italic">
                          &ldquo;{s.today_note.length > 60 ? s.today_note.slice(0, 57) + '…' : s.today_note}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30 mt-1 shrink-0" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
