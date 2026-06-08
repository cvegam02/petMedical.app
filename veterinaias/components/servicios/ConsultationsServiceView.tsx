'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { ListSkeleton, ListFooter, SectionHeader } from '@/components/ui/list-primitives'

/* ── Types ─────────────────────────────────────────────── */

interface AppointmentRow {
  id: string
  status: string
  scheduled_at: string
  duration_minutes: number | null
  reason: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null } | null
  assigned_to: { id: string; full_name: string } | null
}

interface HistoryRow {
  id: string
  created_at: string
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string } | null
  reason: string | null
  diagnosis: string | null
  attended_by_name: string | null
}

/* ── Helpers ────────────────────────────────────────────── */

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Agendada',  className: 'text-secondary-foreground bg-secondary border-secondary-foreground/20' },
  confirmed:  { label: 'Confirmada', className: 'text-primary bg-accent border-primary/20' },
  completed:  { label: 'Completada', className: 'text-green-700 bg-green-50 border-green-200' },
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateCompact(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function todayLabel() {
  return new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

/* ── Appointment Row ─────────────────────────────────────── */

function AppointmentRow({
  row,
  index,
  onNavigate,
  muted = false,
  showDateTime = false,
}: {
  row: AppointmentRow
  index: number
  onNavigate: (id: string) => void
  muted?: boolean
  showDateTime?: boolean
}) {
  const PetIcon = getSpeciesIcon(row.pet?.species?.name)
  const badge = STATUS_LABEL[row.status] ?? STATUS_LABEL.scheduled

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div
        className={`group relative flex items-center gap-4 px-6 py-3 hover:bg-primary/[0.01] transition-colors duration-200 cursor-pointer${muted ? ' opacity-85' : ''}`}
        onClick={() => onNavigate(row.id)}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Mascota */}
        <div className="flex items-center gap-3 w-[150px] min-w-0 shrink-0">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
            <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">
              {row.pet?.name ?? '—'}
            </p>
            {row.pet?.species?.name && (
              <p className="text-[10px] text-muted-foreground truncate">{row.pet.species.name}</p>
            )}
          </div>
        </div>

        {/* Motivo */}
        <p className="flex-1 text-[12px] text-muted-foreground truncate min-w-0">
          {row.reason ?? <span className="italic opacity-50">Sin motivo</span>}
        </p>

        {/* Responsable */}
        <p className="text-[11px] text-muted-foreground w-[160px] shrink-0 truncate">
          {row.assigned_to?.full_name ?? row.owner?.full_name ?? '—'}
        </p>

        {/* Hora / Fecha+Hora */}
        {showDateTime ? (
          <div className="w-[80px] shrink-0 space-y-[1px]">
            <p className="text-[10px] text-muted-foreground">{fmtDateCompact(row.scheduled_at)}</p>
            <p className="text-[12px] font-semibold tabular-nums text-foreground">{fmtTime(row.scheduled_at)}</p>
          </div>
        ) : (
          <p className="text-[12px] font-semibold tabular-nums text-foreground w-[60px] shrink-0">
            {fmtTime(row.scheduled_at)}
          </p>
        )}

        {/* Estado */}
        <span className={`text-[10px] font-semibold px-2 py-[2px] rounded-full border shrink-0 ${badge.className}`}>
          {badge.label}
        </span>

        {/* Chevron */}
        <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
          <ChevronRight size={15} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  )
}

/* ── Column Headers ─────────────────────────────────────── */

function ApptColumnHeaders({ showDateTime = false }: { showDateTime?: boolean }) {
  return (
    <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[150px] shrink-0">Mascota</span>
      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Motivo</span>
      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[160px] shrink-0">Responsable</span>
      <span className={`text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 shrink-0 ${showDateTime ? 'w-[80px]' : 'w-[60px]'}`}>
        {showDateTime ? 'Fecha / Hora' : 'Hora'}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[80px] shrink-0">Estado</span>
      <span className="w-9 shrink-0" />
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────── */

export function ConsultationsServiceView() {
  const router = useRouter()
  const [hoy, setHoy] = useState<AppointmentRow[]>([])
  const [proximas, setProximas] = useState<AppointmentRow[]>([])
  const [historial, setHistorial] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [rHoy, rProximas, rHistorial] = await Promise.all([
        fetch('/api/servicios/consulta?tab=hoy').then(r => r.json()),
        fetch('/api/servicios/consulta?tab=proximas').then(r => r.json()),
        fetch('/api/servicios/consulta').then(r => r.json()),
      ])
      setHoy(rHoy.data ?? [])
      setProximas(rProximas.data ?? [])
      setHistorial(rHistorial.data ?? [])
    } catch {
      setHoy([])
      setProximas([])
      setHistorial([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    window.addEventListener('appointment:created', load)
    return () => window.removeEventListener('appointment:created', load)
  }, [])

  if (loading) return <ListSkeleton rows={6} />

  const proximasSorted = [...proximas].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )

  return (
    <div className="space-y-6">

      {/* ── Hoy ── */}
      <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
        <SectionHeader variant="blue" title={`Hoy — ${todayLabel()}`} count={hoy.length} />
        {hoy.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-semibold text-muted-foreground">Sin consultas para hoy</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Las citas agendadas para hoy aparecerán aquí.</p>
          </div>
        ) : (
          <>
            <ApptColumnHeaders />
            <div className="divide-y divide-[#f3f5f7]">
              {hoy.map((row, i) => (
                <AppointmentRow
                  key={row.id}
                  row={row}
                  index={i}
                  onNavigate={id => router.push(`/dashboard/servicios/consulta/${id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Próximas ── */}
      {proximasSorted.length > 0 && (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
          <SectionHeader variant="muted" title="Próximas citas" count={proximasSorted.length} />
          <ApptColumnHeaders showDateTime />
          <div className="divide-y divide-[#f3f5f7]">
            {proximasSorted.map((row, i) => (
              <AppointmentRow
                key={row.id}
                row={row}
                index={i}
                onNavigate={id => router.push(`/dashboard/servicios/consulta/${id}`)}
                muted
                showDateTime
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Historial ── */}
      {historial.length > 0 && (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
          <SectionHeader variant="muted" title="Historial de consultas" count={historial.length} />
          {/* Column headers */}
          <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[90px] shrink-0">Fecha</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[140px] shrink-0">Mascota</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Motivo / Diagnóstico</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[160px] shrink-0">Veterinario</span>
            <span className="w-9 shrink-0" />
          </div>
          <div className="divide-y divide-[#f3f5f7]">
            {historial.map((row, index) => {
              const PetIcon = getSpeciesIcon(row.pet?.species?.name)
              return (
                <div
                  key={row.id}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div
                    className="group relative flex items-center gap-4 px-6 py-3 hover:bg-primary/[0.01] transition-colors duration-200 cursor-pointer"
                    onClick={() => row.pet?.id && router.push(`/dashboard/pets/${row.pet.id}/records/${row.id}`)}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Fecha */}
                    <p className="text-[11px] text-muted-foreground w-[90px] shrink-0 whitespace-nowrap">
                      {fmtDateShort(row.created_at)}
                    </p>

                    {/* Mascota */}
                    <div className="flex items-center gap-3 w-[140px] min-w-0 shrink-0">
                      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                        <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                          {row.pet?.name ?? '—'}
                        </p>
                        {row.pet?.species?.name && (
                          <p className="text-[10px] text-muted-foreground truncate">{row.pet.species.name}</p>
                        )}
                      </div>
                    </div>

                    {/* Motivo / Diagnóstico */}
                    <p className="flex-1 text-[12px] text-muted-foreground truncate min-w-0">
                      {row.diagnosis ?? row.reason ?? <span className="italic opacity-50">—</span>}
                    </p>

                    {/* Veterinario */}
                    <p className="text-[11px] text-muted-foreground w-[160px] shrink-0 truncate">
                      {row.attended_by_name ?? '—'}
                    </p>

                    {/* Chevron */}
                    <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
                      <ChevronRight size={15} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <ListFooter count={historial.length} label={historial.length === 1 ? 'consulta' : 'consultas'} />
        </div>
      )}

    </div>
  )
}
