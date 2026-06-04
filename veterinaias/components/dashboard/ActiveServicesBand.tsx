'use client'
import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
import { serviceTypeConfig } from '@/lib/constants/service-type'
import type { ServiceType } from '@/lib/types/database'
import {
  GroomingSessionDetailModal,
  type GroomingSessionDetail,
} from '@/components/servicios/GroomingSessionDetailModal'
import { BoardingStayDetailModal } from '@/components/servicios/BoardingStayDetailModal'
import { HospitalizationDetailModal } from '@/components/servicios/HospitalizationDetailModal'
import { isCheckoutOverdue } from '@/lib/utils/boarding'

export interface ActiveServiceItem extends GroomingSessionDetail {
  service_type: ServiceType
  appointment_id: string | null
  expected_check_out: string | null
}

function elapsedLabel(startedAt: string | null, now: number): string {
  if (!startedAt) return '—'
  const mins = Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 60000))
  if (mins < 60) return `${mins} min en curso`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min en curso` : `${h}h en curso`
}

function boardingDayLabel(startedAt: string | null, expectedCheckOut: string | null, now: number): string {
  if (!startedAt) return '—'
  const day = Math.max(1, Math.floor((now - new Date(startedAt).getTime()) / 86400000) + 1)
  if (!expectedCheckOut) return `Día ${day}`
  const sale = new Date(expectedCheckOut).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  return `Día ${day} · sale ${sale}`
}

interface Props {
  initial: ActiveServiceItem[]
  /** Called after a service is finalized so the parent can refresh (metrics/citas). */
  onChanged?: () => void
}

export function ActiveServicesBand({ initial, onChanged }: Props) {
  const [items, setItems] = useState<ActiveServiceItem[]>(initial)
  const [now, setNow] = useState(() => Date.now())
  const [selected, setSelected] = useState<ActiveServiceItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [hospDetailId, setHospDetailId] = useState<string | null>(null)
  const [hospDetailOpen, setHospDetailOpen] = useState(false)

  // Live elapsed counter.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Light poll to catch new/finished services without a full reload.
  async function refresh() {
    try {
      const res = await fetch('/api/service-visits/active')
      if (!res.ok) return
      const json = await res.json()
      setItems(json.data ?? [])
    } catch {
      // keep last data on failure
    }
  }

  useEffect(() => {
    const t = setInterval(refresh, 60_000)
    return () => clearInterval(t)
  }, [])

  function openDetail(item: ActiveServiceItem) {
    if (item.service_type === 'hospitalization') {
      setHospDetailId(item.id)
      setHospDetailOpen(true)
    } else {
      setSelected(item)
      setDetailOpen(true)
    }
  }

  if (items.length === 0) {
    return (
      <section>
        <p className="label-overline text-muted-foreground/50 mb-3">Servicios activos</p>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border/60 bg-muted/10">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">Sin servicios en curso</p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-[0.1em]">Servicios activos</p>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{items.length}</span>
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const svc = serviceTypeConfig(item.service_type)
          const SvcIcon = svc.Icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openDetail(item)}
              className="w-full text-left flex items-center gap-3 rounded-xl border border-amber-200 bg-card px-4 py-3 hover:shadow-sm hover:border-amber-300 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground leading-none">
                    {item.pet?.name ?? '—'}
                    {item.pet?.species && (
                      <span className="font-normal text-muted-foreground ml-1.5 text-[11px]">{item.pet.species.name}</span>
                    )}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-border bg-muted/40 text-foreground/70">
                    <SvcIcon size={9} strokeWidth={2.25} />
                    {svc.label}
                  </span>
                  {item.services.slice(0, 3).map(s => (
                    <span key={s.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {s.service_name}
                    </span>
                  ))}
                </div>
              </div>
              {item.service_type === 'boarding' && isCheckoutOverdue(item.expected_check_out, item.started_at, item.ended_at, now) ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 whitespace-nowrap shrink-0">
                  <Timer size={12} />
                  Salida vencida
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
                  <Timer size={12} />
                  {(item.service_type === 'boarding' || item.service_type === 'hospitalization') ? boardingDayLabel(item.started_at, item.expected_check_out, now) : elapsedLabel(item.started_at, now)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selected?.service_type === 'boarding' ? (
        <BoardingStayDetailModal
          visitId={detailOpen ? selected.id : null}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onChanged={() => { refresh(); onChanged?.() }}
        />
      ) : (
        <GroomingSessionDetailModal
          session={selected}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onFinalized={() => { refresh(); onChanged?.() }}
        />
      )}
      <HospitalizationDetailModal
        visitId={hospDetailOpen ? hospDetailId : null}
        open={hospDetailOpen}
        onOpenChange={setHospDetailOpen}
        onChanged={() => { refresh(); onChanged?.() }}
      />
    </section>
  )
}
