'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, User } from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import { SectionHeader } from '@/components/ui/list-primitives'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

interface Reservation extends DashboardAppointment {
  expected_check_out: string | null
}

function fmtDateTime(d: string | null): string {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    + ' ' + date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
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
      <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
        <SectionHeader variant="muted" title="Próximas reservas" count={items.length} />

        {/* Column headers */}
        <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[150px] shrink-0">Mascota</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[130px] shrink-0">Responsable</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[90px] shrink-0">Entrada</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Salida</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[100px] shrink-0">Estado</span>
          <span className="w-9 shrink-0" />
        </div>

        <div className="divide-y divide-[#f3f5f7]">
          {items.map((r, index) => {
            const cfg = APPOINTMENT_STATUS_CONFIG[r.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
            const PetIcon = getSpeciesIcon(r.pet?.species?.name)
            return (
              <div
                key={r.id}
                className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div
                  className="group relative flex items-center gap-4 px-6 py-3 opacity-85 hover:opacity-100 hover:bg-primary/[0.01] transition-all duration-200 cursor-pointer"
                  onClick={() => router.push(`/dashboard/servicios/hotel/${r.id}`)}
                >
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Pet */}
                  <div className="flex items-center gap-3 w-[150px] min-w-0 shrink-0">
                    <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                      <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">{r.pet?.name ?? '—'}</p>
                      {r.pet?.species?.name && <p className="text-[10px] text-muted-foreground truncate">{r.pet.species.name}</p>}
                    </div>
                  </div>

                  {/* Owner */}
                  <div className="w-[130px] shrink-0 min-w-0">
                    {r.owner ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                          <User size={10} className="text-muted-foreground" />
                        </div>
                        <p className="text-[11px] font-medium text-foreground truncate">{r.owner.full_name}</p>
                      </div>
                    ) : <span className="text-[11px] text-muted-foreground/40">—</span>}
                  </div>

                  {/* Check-in */}
                  <div className="w-[90px] shrink-0">
                    <p className="text-[12px] font-semibold tabular-nums text-foreground">{fmtDateTime(r.scheduled_at)}</p>
                  </div>

                  {/* Check-out */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-muted-foreground">{fmtDateTime(r.expected_check_out)}</p>
                  </div>

                  {/* Status */}
                  <div className="w-[100px] shrink-0">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Chevron */}
                  <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
                    <ChevronRight size={15} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
