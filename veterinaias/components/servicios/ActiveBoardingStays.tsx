'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, BedDouble, Cat, Dog, PawPrint, CalendarDays } from 'lucide-react'
import { isCheckoutOverdue, stayDayLabel, remainingDaysLabel } from '@/lib/utils/boarding'

interface StayRow {
  id: string
  started_at: string | null
  ended_at: string | null
  expected_check_out: string | null
  today_note: string | null
  today_fed: boolean | null
  today_walked: boolean | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string } | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short',
  })
}

function getPetIcon(speciesName: string | null | undefined) {
  const s = speciesName?.toLowerCase() ?? ''
  if (s.includes('fel') || s.includes('gat')) return Cat
  if (s.includes('can') || s.includes('perr')) return Dog
  return PawPrint
}

export function ActiveBoardingStays() {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stays.map(s => {
            const overdue = isCheckoutOverdue(s.expected_check_out, s.started_at, s.ended_at)
            const remaining = remainingDaysLabel(s.expected_check_out, s.ended_at)
            const subtitle = [s.pet?.species?.name, s.owner?.full_name].filter(Boolean).join(' · ')
            const PetIcon = getPetIcon(s.pet?.species?.name)
            return (
              <Link
                key={s.id}
                href={`/dashboard/servicios/hotel/${s.id}`}
                className="group flex flex-col bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="w-11 h-11 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 border border-border/50">
                    <PetIcon size={22} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-none">
                      {s.pet?.name ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 truncate">
                      {subtitle || 'Sin datos del paciente'}
                    </p>
                  </div>
                  {s.today_fed !== null && (
                    <div className="flex items-center gap-2.5 text-xs shrink-0">
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground/50">Comió</span>
                        {s.today_fed
                          ? <span className="text-green-600 font-bold">✓</span>
                          : <span className="text-muted-foreground/30">—</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground/50">Paseó</span>
                        {s.today_walked
                          ? <span className="text-green-600 font-bold">✓</span>
                          : <span className="text-muted-foreground/30">—</span>}
                      </span>
                    </div>
                  )}
                  <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
                </div>
                <div className={`flex items-center justify-between px-4 py-2.5 border-t bg-muted/20 ${overdue ? 'border-orange-100 bg-orange-50/60' : 'border-border/60'}`}>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    {stayDayLabel(s.started_at, s.expected_check_out)}
                    {!overdue && remaining && (
                      <span className="text-muted-foreground/50">· {remaining}</span>
                    )}
                    {overdue && (
                      <span className="text-orange-600 font-medium">· Salida vencida</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays size={11} className="text-muted-foreground/40 shrink-0" />
                    {formatDate(s.started_at)} → {formatDate(s.expected_check_out)}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
