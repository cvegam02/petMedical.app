'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Timer } from 'lucide-react'
import { serviceTypeConfig, serviceDetailUrl } from '@/lib/constants/service-type'
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
  onChanged?: () => void
}

export function ActiveServicesBand({ initial, onChanged }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ActiveServiceItem[]>(initial)
  const [now, setNow] = useState(() => Date.now())
  const [selected, setSelected] = useState<ActiveServiceItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [hospDetailId, setHospDetailId] = useState<string | null>(null)
  const [hospDetailOpen, setHospDetailOpen] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

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
    } else if (item.service_type === 'consultation' || item.service_type === 'surgery') {
      if (item.appointment_id) {
        router.push(serviceDetailUrl(item.service_type, item.appointment_id))
      }
    } else {
      setSelected(item)
      setDetailOpen(true)
    }
  }

  if (items.length === 0) {
    return (
      <section>
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#73808C] mb-3">Servicios activos</p>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#E7EBEF] bg-[#FAFBFC]">
          <span className="w-2 h-2 rounded-full bg-[#D0D8E0] shrink-0" />
          <p className="text-xs text-[#73808C]">Sin servicios en curso · La clínica está libre</p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[#E7EBEF] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#35C48B] shrink-0" />
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#55616C]">Servicios activos</p>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.05em] px-2 py-0.5 rounded-md bg-[#F1FCF7] border border-[#DCF8EB] text-[#1D865C]">
          {items.length} en curso
        </span>
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const svc = serviceTypeConfig(item.service_type)
          const SvcIcon = svc.Icon
          const isOverdue = item.service_type === 'boarding' &&
            isCheckoutOverdue(item.expected_check_out, item.started_at, item.ended_at, now)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openDetail(item)}
              className={`w-full text-left flex items-center gap-3 rounded-xl border px-4 py-3 hover:opacity-90 transition-opacity ${
                isOverdue ? 'border-[#FECACA] bg-[#FAFBFC]' : 'border-[#E7EBEF] bg-[#FAFBFC]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? 'bg-[#DC2626]' : 'bg-[#35C48B]'}`}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#161D24] leading-none">
                    {item.pet?.name ?? '—'}
                    {item.pet?.species && (
                      <span className="font-normal text-[#73808C] ml-1.5 text-[11px]">{item.pet.species.name}</span>
                    )}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-[#E7EBEF] bg-[#F3F5F7] text-[#55616C] uppercase tracking-[0.05em]">
                    <SvcIcon size={9} strokeWidth={2.25} />
                    {svc.label}
                  </span>
                  {item.services.slice(0, 3).map(s => (
                    <span key={s.id} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#F3F8FC] border border-[#E7EBEF] text-[#337DB9]">
                      {s.service_name}
                    </span>
                  ))}
                </div>
              </div>
              {isOverdue ? (
                <span className="flex items-center gap-1 text-xs font-bold text-[#DC2626] whitespace-nowrap shrink-0">
                  <Timer size={12} />
                  Salida vencida
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-[#F59E0B] whitespace-nowrap shrink-0">
                  <Timer size={12} />
                  {(item.service_type === 'boarding' || item.service_type === 'hospitalization')
                    ? boardingDayLabel(item.started_at, item.expected_check_out, now)
                    : elapsedLabel(item.started_at, now)}
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
