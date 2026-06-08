'use client'
import { useState } from 'react'
import { ChevronRight, User } from 'lucide-react'
import { AppointmentDetailDialog } from '@/components/appointments/AppointmentDetailDialog'
import { serviceTypeConfig } from '@/lib/constants/service-type'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

interface Props {
  appointments: DashboardAppointment[]
}

const TERMINAL_STATUSES = new Set(['cancelled', 'completed', 'no_show'])

function fmtTime(d: string): string {
  return new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function AppointmentChipsStrip({ appointments }: Props) {
  const [selected, setSelected] = useState<DashboardAppointment | null>(null)

  const now = new Date()
  const upcoming = appointments
    .filter(a => new Date(a.scheduled_at) >= now && !TERMINAL_STATUSES.has(a.status))
    .slice(0, 5)

  return (
    <>
      <section>
        <div className="flex items-center gap-2 mb-4">
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em]">Próximas citas</p>
          {upcoming.length > 0 && (
            <span className="inline-flex items-center justify-center bg-muted text-muted-foreground text-[12px] font-mono px-2 py-0.5 rounded-md border border-border/50">
              {upcoming.length}
            </span>
          )}
        </div>

        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-2">Sin citas pendientes por el resto del día</p>
        ) : (
          <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
            {/* Column headers */}
            <div className="flex items-center gap-6 px-6 py-4 bg-muted/20 border-b border-border/60">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-16">Hora</p>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-[30%]">Mascota</p>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex-1">Responsable</p>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-28">Servicio</p>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-24">Estado</p>
              <div className="w-9" />
            </div>

            <div className="divide-y divide-border/40">
              {upcoming.map((apt, index) => {
                const cfg = APPOINTMENT_STATUS_CONFIG[apt.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
                const svc = serviceTypeConfig(apt.service_type)
                const PetIcon = getSpeciesIcon(apt.pet?.species?.name)
                return (
                  <div
                    key={apt.id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                    style={{ animationDelay: `${index * 35}ms` }}
                  >
                    <div
                      className="group relative flex items-center gap-6 py-4 px-6 hover:bg-primary/[0.01] active:scale-[0.998] transition-all duration-300 cursor-pointer"
                      onClick={() => setSelected(apt)}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full group-hover:h-7 transition-all duration-300" />

                      {/* Time */}
                      <div className="w-16 shrink-0">
                        <p className="text-[13px] font-bold text-foreground font-mono">{fmtTime(apt.scheduled_at)}</p>
                      </div>

                      {/* Pet */}
                      <div className="flex items-center gap-3 w-[30%] min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-muted/50 to-muted border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-500 shrink-0">
                          <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-[14px] leading-tight truncate group-hover:text-primary transition-colors">
                            {apt.pet?.name ?? '—'}
                          </p>
                          {apt.pet?.species?.name && (
                            <p className="text-[11px] text-muted-foreground truncate">{apt.pet.species.name}</p>
                          )}
                        </div>
                      </div>

                      {/* Owner */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 text-foreground/70 group-hover:text-foreground transition-colors">
                          <div className="w-7 h-7 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                            <User size={13} className="text-muted-foreground group-hover:text-primary" />
                          </div>
                          <p className="text-[13px] font-medium truncate">{apt.owner?.full_name ?? '—'}</p>
                        </div>
                      </div>

                      {/* Service */}
                      <div className="w-28 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <svc.Icon size={11} strokeWidth={2} />
                          {svc.label}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="w-24 shrink-0">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.className}`}>{cfg.label}</span>
                      </div>

                      {/* Chevron */}
                      <div className="shrink-0 flex items-center">
                        <div className="w-9 h-9 rounded-xl bg-muted/20 border border-transparent flex items-center justify-center text-muted-foreground/30 group-hover:text-primary group-hover:bg-white group-hover:border-border group-hover:shadow-sm transition-all duration-300">
                          <ChevronRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/5 border-t border-border/40 flex items-center justify-between">
              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                {upcoming.length} {upcoming.length === 1 ? 'cita próxima' : 'citas próximas'}
              </p>
              <a
                href="/dashboard/appointments"
                className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter hover:text-primary transition-colors"
              >
                Ver agenda completa →
              </a>
            </div>
          </div>
        )}
      </section>

      <AppointmentDetailDialog
        open={selected !== null}
        onOpenChange={(open) => { if (!open) setSelected(null) }}
        appointment={selected}
      />
    </>
  )
}
