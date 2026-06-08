'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AppointmentDetailDialog } from '@/components/appointments/AppointmentDetailDialog'
import { serviceTypeConfig } from '@/lib/constants/service-type'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

interface Props {
  appointments: DashboardAppointment[]
}

const TERMINAL_STATUSES = new Set(['cancelled', 'completed', 'no_show'])

function chipStyle(apt: DashboardAppointment): string {
  if (apt.status === 'confirmed') {
    return 'bg-[#F1FCF7] border-[#DCF8EB]'
  }
  const minsUntil = (new Date(apt.scheduled_at).getTime() - Date.now()) / 60000
  if (apt.status === 'scheduled' && minsUntil <= 60) {
    return 'bg-[#FFFBEB] border-[#FDE68A]'
  }
  return 'bg-[#F3F5F7] border-[#E7EBEF]'
}

function statusLabel(apt: DashboardAppointment): { text: string; className: string } | null {
  if (apt.status === 'confirmed') {
    return { text: '✓ Confirmada', className: 'text-[#1D865C] font-semibold' }
  }
  const minsUntil = (new Date(apt.scheduled_at).getTime() - Date.now()) / 60000
  if (apt.status === 'scheduled' && minsUntil <= 60) {
    return { text: 'Sin confirmar', className: 'text-[#92400E] font-semibold' }
  }
  return null
}

export function AppointmentChipsStrip({ appointments }: Props) {
  const [selected, setSelected] = useState<DashboardAppointment | null>(null)

  const now = new Date()
  const upcoming = appointments.filter(
    a => new Date(a.scheduled_at) >= now && !TERMINAL_STATUSES.has(a.status)
  )
  const visible = upcoming.slice(0, 5)
  const overflowCount = Math.max(0, upcoming.length - 5)

  return (
    <>
      <div className="rounded-[14px] border border-[#E7EBEF] bg-white px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#55616C]">Próximas citas</p>
          <Link
            href="/dashboard/appointments"
            className="text-[10px] font-bold text-[#35C48B] hover:text-[#27A673] transition-colors"
          >
            Ver agenda completa →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-xs text-[#73808C] py-2">Sin citas pendientes por el resto del día</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {visible.map(apt => {
              const time = new Date(apt.scheduled_at).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })
              const svc = serviceTypeConfig(apt.service_type)
              const label = statusLabel(apt)
              return (
                <button
                  key={apt.id}
                  type="button"
                  onClick={() => setSelected(apt)}
                  className={`rounded-[10px] border px-3 py-2 text-left min-w-[80px] hover:opacity-80 transition-opacity ${chipStyle(apt)}`}
                >
                  <p className="text-[10px] font-bold text-[#0F4C81] font-mono">{time}</p>
                  <p className="text-xs font-bold text-[#161D24] mt-0.5">{apt.pet?.name ?? '—'}</p>
                  {label ? (
                    <p className={`text-[9px] mt-0.5 ${label.className}`}>{label.text}</p>
                  ) : (
                    <p className="text-[9px] text-[#73808C] mt-0.5">{svc.label}</p>
                  )}
                </button>
              )
            })}
            {overflowCount > 0 && (
              <div className="rounded-[10px] border border-[#E7EBEF] bg-[#F3F5F7] px-3 py-2 flex items-center justify-center min-w-[48px]">
                <span className="text-[10px] font-bold text-[#73808C]">+{overflowCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <AppointmentDetailDialog
        open={selected !== null}
        onOpenChange={(open) => { if (!open) setSelected(null) }}
        appointment={selected}
      />
    </>
  )
}
