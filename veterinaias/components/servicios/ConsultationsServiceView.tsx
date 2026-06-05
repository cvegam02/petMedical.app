'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, Cat, Dog, PawPrint, Stethoscope, Clock, User,
  Calendar, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

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
  scheduled: { label: 'Agendada', className: 'text-secondary-foreground bg-secondary border-secondary-foreground/20' },
  confirmed:  { label: 'Confirmada', className: 'text-primary bg-accent border-primary/20' },
  completed:  { label: 'Completada', className: 'text-green-700 bg-green-50 border-green-200' },
}

function getPetIcon(speciesName: string | null | undefined) {
  const s = speciesName?.toLowerCase() ?? ''
  if (s.includes('fel') || s.includes('gat')) return Cat
  if (s.includes('can') || s.includes('perr')) return Dog
  return PawPrint
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

/* ── Appointment Card (hoy / próximas) ──────────────────── */

function AppointmentCard({ row, onNavigate }: { row: AppointmentRow; onNavigate: (id: string) => void }) {
  const PetIcon = getPetIcon(row.pet?.species?.name)
  const badge = STATUS_LABEL[row.status] ?? STATUS_LABEL.scheduled

  return (
    <div
      className="group relative flex items-center gap-5 py-4 px-5 hover:bg-primary/[0.015] active:scale-[0.998] transition-all duration-200 cursor-pointer"
      onClick={() => onNavigate(row.id)}
    >
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-primary rounded-r-full group-hover:h-8 transition-all duration-300" />

      {/* Time */}
      <div className="w-14 shrink-0 text-center">
        <p className="text-base font-bold text-foreground tabular-nums leading-none">
          {fmtTime(row.scheduled_at)}
        </p>
        {row.duration_minutes && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{row.duration_minutes}min</p>
        )}
      </div>

      {/* Pet */}
      <div className="flex items-center gap-3 w-44 min-w-0 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center group-hover:border-primary/20 group-hover:bg-primary/5 transition-all shrink-0">
          <PetIcon size={18} strokeWidth={1.5} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[14px] text-foreground truncate group-hover:text-primary transition-colors leading-tight">
            {row.pet?.name ?? '—'}
          </p>
          {row.pet?.species?.name && (
            <p className="text-[12px] text-muted-foreground truncate">{row.pet.species.name}</p>
          )}
        </div>
      </div>

      {/* Owner */}
      <div className="flex items-center gap-2 w-40 min-w-0 shrink-0">
        <div className="w-6 h-6 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
          <User size={11} className="text-muted-foreground" />
        </div>
        <p className="text-[13px] text-muted-foreground truncate">{row.owner?.full_name ?? '—'}</p>
      </div>

      {/* Reason */}
      <p className="flex-1 text-[13px] text-muted-foreground truncate min-w-0">
        {row.reason ?? <span className="italic opacity-50">Sin motivo registrado</span>}
      </p>

      {/* Vet */}
      {row.assigned_to && (
        <p className="text-[12px] text-muted-foreground/70 w-32 shrink-0 truncate">
          {row.assigned_to.full_name}
        </p>
      )}

      {/* Status + arrow */}
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badge.className}`}>
          {badge.label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-muted/20 border border-transparent flex items-center justify-center text-muted-foreground/30 group-hover:text-primary group-hover:bg-white group-hover:border-border group-hover:shadow-sm transition-all duration-300">
          <ChevronRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  )
}

/* ── Section wrapper ────────────────────────────────────── */

function Section({
  icon: Icon,
  title,
  count,
  children,
  empty,
}: {
  icon: React.ElementType
  title: string
  count: number
  children: React.ReactNode
  empty: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-muted-foreground/60" strokeWidth={1.75} />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {count > 0 && (
          <span className="text-[11px] font-bold text-secondary-foreground bg-secondary border border-secondary-foreground/20 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {count === 0 ? empty : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border/50">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────── */

export function ConsultationsServiceView() {
  const router = useRouter()
  const [hoy, setHoy] = useState<AppointmentRow[]>([])
  const [proximas, setProximas] = useState<AppointmentRow[]>([])
  const [historial, setHistorial] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [rHoy, rProximas, rHistorial] = await Promise.all([
      fetch('/api/servicios/consulta?tab=hoy').then(r => r.json()),
      fetch('/api/servicios/consulta?tab=proximas').then(r => r.json()),
      fetch('/api/servicios/consulta').then(r => r.json()),
    ])
    setHoy(rHoy.data ?? [])
    setProximas(rProximas.data ?? [])
    setHistorial(rHistorial.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    window.addEventListener('appointment:created', load)
    return () => window.removeEventListener('appointment:created', load)
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-32 bg-muted/40 rounded animate-pulse" />
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {[1, 2].map(j => (
                <div key={j} className="flex items-center gap-5 px-5 py-4 border-b border-border/50 last:border-0">
                  <div className="w-14 h-10 bg-muted/30 rounded animate-pulse shrink-0" />
                  <div className="w-10 h-10 bg-muted/30 rounded-xl animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/4 bg-muted/40 rounded animate-pulse" />
                    <div className="h-3 w-1/6 bg-muted/20 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const emptyInline = (text: string) => (
    <p className="text-sm text-muted-foreground/60 italic py-2 pl-1">{text}</p>
  )

  return (
    <div className="space-y-10">

      {/* HOY */}
      <Section
        icon={Clock}
        title="Hoy"
        count={hoy.length}
        empty={emptyInline('No hay consultas agendadas para hoy.')}
      >
        {hoy.map(row => (
          <AppointmentCard
            key={row.id}
            row={row}
            onNavigate={id => router.push(`/dashboard/appointments/${id}`)}
          />
        ))}
      </Section>

      {/* PRÓXIMAS */}
      <Section
        icon={Calendar}
        title="Próximas citas"
        count={proximas.length}
        empty={emptyInline('No hay consultas próximas agendadas.')}
      >
        {/* Date group headers */}
        {(() => {
          const groups: { date: string; rows: AppointmentRow[] }[] = []
          for (const row of proximas) {
            const d = fmtDate(row.scheduled_at)
            const last = groups[groups.length - 1]
            if (last?.date === d) last.rows.push(row)
            else groups.push({ date: d, rows: [row] })
          }
          return groups.map(g => (
            <div key={g.date}>
              <div className="px-5 py-2 bg-muted/20 border-b border-border/50">
                <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide capitalize">{g.date}</p>
              </div>
              {g.rows.map(row => (
                <AppointmentCard
                  key={row.id}
                  row={row}
                  onNavigate={id => router.push(`/dashboard/appointments/${id}`)}
                />
              ))}
            </div>
          ))
        })()}
      </Section>

      {/* HISTORIAL */}
      <Section
        icon={Stethoscope}
        title="Historial de consultas"
        count={historial.length}
        empty={
          <div className="flex flex-col items-center gap-3 py-16 text-center rounded-2xl border-2 border-dashed border-border/60">
            <Stethoscope size={28} className="text-muted-foreground/20" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No hay consultas registradas aún.</p>
          </div>
        }
      >
        {/* Table header */}
        <div className="flex items-center gap-5 px-5 py-3 bg-muted/20 border-b border-border/60">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide w-24 shrink-0">Fecha</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide w-44 shrink-0">Paciente</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide w-36 shrink-0">Dueño</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide flex-1">Motivo / Diagnóstico</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide w-32 shrink-0">Veterinario</p>
          <div className="w-8 shrink-0" />
        </div>
        {historial.map((row, i) => {
          const PetIcon = getPetIcon(row.pet?.species?.name)
          return (
            <div
              key={row.id}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <div
                className="group flex items-center gap-5 px-5 py-3.5 hover:bg-primary/[0.015] cursor-pointer transition-colors"
                onClick={() => row.pet?.id && router.push(`/dashboard/pets/${row.pet.id}/records/${row.id}`)}
              >
                <p className="text-[13px] text-muted-foreground w-24 shrink-0 whitespace-nowrap">
                  {fmtDateShort(row.created_at)}
                </p>
                <div className="flex items-center gap-2.5 w-44 min-w-0 shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                    <PetIcon size={13} strokeWidth={1.5} className="text-muted-foreground/60" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {row.pet?.name ?? '—'}
                    </p>
                    {row.pet?.species?.name && (
                      <p className="text-[11px] text-muted-foreground/60 truncate">{row.pet.species.name}</p>
                    )}
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground w-36 shrink-0 truncate">
                  {row.owner?.full_name ?? '—'}
                </p>
                <p className="flex-1 text-[13px] text-muted-foreground truncate min-w-0">
                  {row.diagnosis ?? row.reason ?? <span className="italic opacity-50">—</span>}
                </p>
                <p className="text-[12px] text-muted-foreground/70 w-32 shrink-0 truncate">
                  {row.attended_by_name ?? '—'}
                </p>
                <div className="w-8 h-8 rounded-lg bg-muted/20 border border-transparent flex items-center justify-center text-muted-foreground/20 group-hover:text-primary group-hover:bg-white group-hover:border-border group-hover:shadow-sm transition-all duration-300 shrink-0">
                  <ChevronRight size={14} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          )
        })}
        {/* Footer */}
        <div className="px-5 py-3.5 bg-muted/5 border-t border-border/40 flex items-center justify-between">
          <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
            {historial.length} {historial.length === 1 ? 'consulta registrada' : 'consultas registradas'}
          </p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
            <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Registros actualizados</span>
          </div>
        </div>
      </Section>

    </div>
  )
}
