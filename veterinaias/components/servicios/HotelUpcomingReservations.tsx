'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, ChevronRight, User } from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

interface Reservation extends DashboardAppointment {
  expected_check_out: string | null
}

function fmtDateTime(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}


export function HotelUpcomingReservations() {
  const router = useRouter()
  const [items, setItems] = useState<Reservation[]>([])
  const [loaded, setLoaded] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/servicios/hotel/reservations')
      if (!res.ok) return
      const json = await res.json()
      setItems(json.data ?? [])
    } catch {
      // keep last data
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    load()
    const refetch = () => load()
    window.addEventListener('appointment:created', refetch)
    window.addEventListener('hotel:changed', refetch)
    return () => {
      window.removeEventListener('appointment:created', refetch)
      window.removeEventListener('hotel:changed', refetch)
    }
  }, [])

  if (!loaded || items.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock size={13} className="text-muted-foreground/60" />
        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em]">Próximas reservas</p>
        <span className="inline-flex items-center justify-center bg-muted text-muted-foreground text-[12px] font-mono px-2 py-0.5 rounded-md border border-border/50">
          {items.length}
        </span>
      </div>

      <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-6 px-6 py-5 bg-muted/20 border-b border-border/60">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-[22%]">Mascota</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex-1">Responsable</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-32">Entrada</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-32">Salida</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-24">Estado</p>
          <div className="w-9" />
        </div>

        <div className="divide-y divide-border/40">
          {items.map((r, index) => {
            const cfg = APPOINTMENT_STATUS_CONFIG[r.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
            const PetIcon = getSpeciesIcon(r.pet?.species?.name)
            return (
              <div
                key={r.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div
                  className="group relative flex items-center gap-6 py-5 px-6 hover:bg-primary/[0.01] active:scale-[0.998] transition-all duration-300 cursor-pointer"
                  onClick={() => router.push(`/dashboard/servicios/hotel/${r.id}`)}
                >
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full group-hover:h-8 transition-all duration-300" />

                  {/* Pet identity */}
                  <div className="flex items-center gap-4 w-[22%] min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted/50 to-muted border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-500 shadow-sm shrink-0">
                      <PetIcon size={22} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-[15px] leading-tight tracking-tight truncate group-hover:text-primary transition-colors">
                        {r.pet?.name ?? '—'}
                      </p>
                      {r.pet?.species?.name && (
                        <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{r.pet.species.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Owner */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 text-foreground/70 group-hover:text-foreground transition-colors">
                      <div className="w-7 h-7 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                        <User size={13} className="text-muted-foreground group-hover:text-primary" />
                      </div>
                      <p className="text-[13px] font-medium truncate">{r.owner?.full_name ?? '—'}</p>
                    </div>
                  </div>

                  {/* Check-in */}
                  <div className="w-32 shrink-0">
                    <p className="text-[13px] font-medium text-foreground">{fmtDateTime(r.scheduled_at)}</p>
                  </div>

                  {/* Check-out */}
                  <div className="w-32 shrink-0">
                    <p className="text-[13px] font-medium text-muted-foreground">{fmtDateTime(r.expected_check_out)}</p>
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
        <div className="px-6 py-5 bg-muted/5 border-t border-border/40 flex items-center justify-between">
          <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
            {items.length} {items.length === 1 ? 'reserva próxima' : 'reservas próximas'}
          </p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
            <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Agenda sincronizada</span>
          </div>
        </div>
      </div>

    </section>
  )
}
