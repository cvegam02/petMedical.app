'use client'
import { useState, useEffect } from 'react'
import { HeartPulse, CheckCircle2 } from 'lucide-react'
import type { PanelProps } from './index'

interface HospStub {
  id: string
  started_at: string | null
  ended_at: string | null
  reason: string | null
}

function dayNumber(startedAt: string | null): number {
  if (!startedAt) return 1
  const start = new Date(startedAt)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(1, Math.round((todayDay.getTime() - startDay.getTime()) / 86400000) + 1)
}

export function HospitalizationPanel({ appointment }: PanelProps) {
  const [loading, setLoading] = useState(false)
  const [hosp, setHosp] = useState<HospStub | null>(null)

  useEffect(() => {
    if (!appointment.id) return
    setLoading(true)
    fetch(`/api/servicios/hospitalizacion?appointmentId=${appointment.id}`)
      .then(r => r.json())
      .then(json => {
        const list = json.data ?? []
        setHosp(list[0] ?? null)
      })
      .catch(() => setHosp(null))
      .finally(() => setLoading(false))
  }, [appointment.id])

  if (loading) return <p className="text-sm text-center text-muted-foreground py-1">Cargando…</p>

  if (hosp?.ended_at) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2">
        <CheckCircle2 size={14} className="text-green-600 shrink-0" />
        <p className="text-sm font-semibold text-green-800">Alta completada</p>
      </div>
    )
  }

  if (hosp?.started_at) {
    return (
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 space-y-1">
        <div className="flex items-center gap-2">
          <HeartPulse size={14} className="text-blue-600 shrink-0" />
          <p className="text-sm font-semibold text-blue-800">Hospitalizado · Día {dayNumber(hosp.started_at)}</p>
        </div>
        {hosp.reason && <p className="text-xs text-blue-700 pl-[22px]">{hosp.reason}</p>}
      </div>
    )
  }

  return (
    <p className="text-sm text-center text-muted-foreground py-1">Sin datos de hospitalización.</p>
  )
}
