'use client'
import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, LogOut, Phone, Mail, Clock, Save, Cat, Dog, PawPrint, Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isCheckoutOverdue, stayDays, stayDayLabel } from '@/lib/utils/boarding'

interface Stay {
  id: string
  started_at: string | null
  ended_at: string | null
  status: string
  expected_check_out: string | null
  feeding_instructions: string | null
  belongings: string | null
  special_care: string | null
  notes: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null; email: string | null } | null
}

interface DailyLog {
  id: string
  log_date: string
  notes: string | null
  fed: boolean
  walked: boolean
}

function fmtDateTime(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function speciesIcon(speciesName: string | null | undefined) {
  const n = (speciesName ?? '').toLowerCase()
  if (n.includes('fel') || n.includes('gat')) return Cat
  if (n.includes('can') || n.includes('perr')) return Dog
  return PawPrint
}

function TodayCard({ visitId, date, log, onSaved }: {
  visitId: string; date: string; log: DailyLog | undefined; onSaved: (l: DailyLog) => void
}) {
  const [notes, setNotes] = useState(log?.notes ?? '')
  const [fed, setFed] = useState(log?.fed ?? false)
  const [walked, setWalked] = useState(log?.walked ?? false)
  const [saving, setSaving] = useState(false)

  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/servicios/hotel/${visitId}/daily-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_date: date, notes: notes.trim() || undefined, fed, walked }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      onSaved(json.data)
      toast.success('Guardado')
    } catch {
      toast.error('Error de red.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider capitalize">
          Hoy — {dateFormatted}
        </h3>
      </div>
      <Textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notas del día…"
        className="resize-none h-20 bg-muted/30 focus:bg-white transition-all"
      />
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={fed} onChange={e => setFed(e.target.checked)} className="rounded" />
          <span>Alimentó</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={walked} onChange={e => setWalked(e.target.checked)} className="rounded" />
          <span>Paseó</span>
        </label>
        <Button size="sm" variant="outline" className="ml-auto" onClick={save} disabled={saving}>
          <Save size={14} className="mr-1.5" />
          {saving ? 'Guardando…' : 'Guardar día'}
        </Button>
      </div>
    </section>
  )
}

function EditRowForm({ visitId, date, log, onSaved, onCancel }: {
  visitId: string; date: string; log: DailyLog | undefined; onSaved: (l: DailyLog) => void; onCancel: () => void
}) {
  const [notes, setNotes] = useState(log?.notes ?? '')
  const [fed, setFed] = useState(log?.fed ?? false)
  const [walked, setWalked] = useState(log?.walked ?? false)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/servicios/hotel/${visitId}/daily-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_date: date, notes: notes.trim() || undefined, fed, walked }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      onSaved(json.data)
      toast.success('Guardado')
    } catch {
      toast.error('Error de red.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-start gap-4 flex-wrap">
      <Textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notas del día…"
        className="resize-none h-14 text-sm flex-1 min-w-[180px]"
      />
      <div className="flex items-center gap-4 text-sm shrink-0 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={fed} onChange={e => setFed(e.target.checked)} />
          <span>Alimentó</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={walked} onChange={e => setWalked(e.target.checked)} />
          <span>Paseó</span>
        </label>
        <Button size="sm" variant="outline" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

function LogTable({ days, today, logByDate, inProgress, visitId, onSaved }: {
  days: string[]; today: string; logByDate: Map<string, DailyLog>
  inProgress: boolean; visitId: string; onSaved: (l: DailyLog) => void
}) {
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const tableDays = inProgress
    ? [...days].filter(d => d < today).reverse()
    : [...days].reverse()

  if (tableDays.length === 0) {
    return (
      <div className="text-center py-10 rounded-xl border border-dashed border-border/60 bg-muted/10">
        <p className="text-sm text-muted-foreground">Sin días anteriores registrados.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest w-12">Día</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">Fecha</th>
            <th className="text-center px-4 py-2.5 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest w-24">Alimentó</th>
            <th className="text-center px-4 py-2.5 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest w-24">Paseó</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">Notas</th>
            <th className="w-16" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {tableDays.map((date) => {
            const log = logByDate.get(date)
            const isEditing = editingDate === date
            const dayNum = days.indexOf(date) + 1
            const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', {
              weekday: 'short', day: '2-digit', month: 'short',
            })
            return (
              <Fragment key={date}>
                <tr className={`transition-colors ${isEditing ? 'bg-muted/20' : 'hover:bg-muted/20'}`}>
                  <td className="px-4 py-3 text-xs font-medium text-muted-foreground">{dayNum}</td>
                  <td className="px-4 py-3 text-sm text-foreground capitalize">{dateFormatted}</td>
                  <td className="px-4 py-3 text-center text-sm">
                    {!log ? <span className="text-muted-foreground/30">—</span>
                      : log.fed ? <span className="text-green-600 font-medium">✓</span>
                      : <span className="text-muted-foreground/40">✗</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {!log ? <span className="text-muted-foreground/30">—</span>
                      : log.walked ? <span className="text-green-600 font-medium">✓</span>
                      : <span className="text-muted-foreground/40">✗</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground italic">
                    {log?.notes || <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingDate(isEditing ? null : date)}
                      className="text-xs text-primary hover:underline"
                    >
                      {isEditing ? 'Cerrar' : 'Editar'}
                    </button>
                  </td>
                </tr>
                {isEditing && (
                  <tr className="bg-muted/10">
                    <td colSpan={6} className="px-4 py-3">
                      <EditRowForm
                        visitId={visitId}
                        date={date}
                        log={log}
                        onSaved={(l) => { onSaved(l); setEditingDate(null) }}
                        onCancel={() => setEditingDate(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface HotelStayPageProps {
  visitId: string
}

export function HotelStayPage({ visitId }: HotelStayPageProps) {
  const router = useRouter()
  const [stay, setStay] = useState<Stay | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [stayRes, logsRes] = await Promise.all([
          fetch(`/api/servicios/hotel/${visitId}`),
          fetch(`/api/servicios/hotel/${visitId}/daily-logs`),
        ])
        const stayJson = await stayRes.json()
        const logsJson = await logsRes.json()
        setStay(stayRes.ok ? stayJson.data : null)
        setLogs(logsRes.ok ? (logsJson.data ?? []) : [])
      } catch {
        setStay(null); setLogs([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [visitId])

  function onDaySaved(saved: DailyLog) {
    setLogs(prev => [...prev.filter(l => l.log_date !== saved.log_date), saved])
  }

  async function checkOut() {
    if (!stay) return
    setCheckingOut(true)
    try {
      const res = await fetch(`/api/servicios/hotel/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ended_at: new Date().toISOString(),
          ...(checkoutNotes.trim() ? { notes: checkoutNotes.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error en el check-out'); return }
      toast.success('Check-out realizado')
      router.push('/dashboard/servicios/hotel')
    } catch {
      toast.error('Error de red.')
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="h-10 w-28 bg-muted/30 animate-pulse rounded-lg" />
        <div className="h-48 bg-muted/30 animate-pulse rounded-2xl" />
        <div className="h-32 bg-muted/20 animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (!stay) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/dashboard/servicios/hotel"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver al hotel
        </Link>
        <div className="text-center py-20 rounded-2xl border border-dashed border-border/60 bg-muted/10">
          <p className="text-sm text-muted-foreground">No se encontró la estancia.</p>
          <Link href="/dashboard/servicios/hotel" className="text-sm text-primary hover:underline mt-2 inline-block">
            Volver al hotel
          </Link>
        </div>
      </div>
    )
  }

  const inProgress = !!stay.started_at && !stay.ended_at
  const isCompleted = !!stay.ended_at
  const overdue = isCheckoutOverdue(stay.expected_check_out, stay.started_at, stay.ended_at)

  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  const endMs = stay.ended_at
    ? new Date(stay.ended_at).getTime()
    : stay.expected_check_out
    ? Math.max(new Date(stay.expected_check_out).getTime(), Date.now())
    : Date.now()
  const days = stayDays(stay.started_at, endMs)
  const logByDate = new Map(logs.map(l => [l.log_date, l]))

  const statusCfg = isCompleted
    ? { label: 'Finalizada', className: 'text-green-700 bg-green-50 border-green-200', stripe: 'bg-green-500' }
    : overdue
    ? { label: 'Salida vencida', className: 'text-orange-600 bg-orange-50 border-orange-200', stripe: 'bg-orange-500' }
    : { label: 'En curso', className: 'text-amber-700 bg-amber-50 border-amber-200', stripe: 'bg-amber-400' }

  const SpeciesIcon = speciesIcon(stay.pet?.species?.name)
  const hasCareInstructions = !!(stay.feeding_instructions || stay.belongings || stay.special_care)

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Back link */}
      <Link
        href="/dashboard/servicios/hotel"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group"
      >
        <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Volver al hotel
      </Link>

      {/* Hero card */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        {/* Color stripe */}
        <div className={`h-1.5 w-full ${statusCfg.stripe}`} />

        <div className="p-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground/50">
                <SpeciesIcon size={36} />
              </div>
              {/* Status dot */}
              <span
                className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card ${
                  isCompleted ? 'bg-green-500'
                  : overdue ? 'bg-orange-500'
                  : 'bg-amber-400 animate-pulse'
                }`}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-3xl font-bold text-foreground leading-none">
                    {stay.pet?.name ?? '—'}
                  </h1>
                  {stay.pet?.species?.name && (
                    <p className="text-sm text-muted-foreground mt-1 capitalize">{stay.pet.species.name}</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider border shrink-0 ${statusCfg.className}`}
                >
                  {inProgress && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1.5" />
                  )}
                  {statusCfg.label}
                </Badge>
              </div>

              {/* Owner info */}
              {stay.owner && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-foreground">{stay.owner.full_name}</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    {stay.owner.phone && (
                      <a
                        href={`tel:${stay.owner.phone}`}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Phone size={12} />
                        {stay.owner.phone}
                      </a>
                    )}
                    {stay.owner.email && (
                      <a
                        href={`mailto:${stay.owner.email}`}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Mail size={12} />
                        {stay.owner.email}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="flex items-center gap-6 flex-wrap text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>Ingreso: {fmtDateTime(stay.started_at)}</span>
                </div>
                {isCompleted ? (
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>Salida: {fmtDateTime(stay.ended_at)}</span>
                  </div>
                ) : (
                  <div className={`flex items-center gap-1.5 ${overdue ? 'text-orange-600 font-medium' : ''}`}>
                    <Clock size={12} />
                    <span>Sale: {fmtDateTime(stay.expected_check_out)}</span>
                  </div>
                )}
                {stay.started_at && (
                  <span className="text-muted-foreground/60">
                    {stayDayLabel(stay.started_at, stay.expected_check_out)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Care instructions */}
      {hasCareInstructions && (
        <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Instrucciones de cuidado
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stay.feeding_instructions && (
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">Alimentación</p>
                <p className="text-sm text-foreground">{stay.feeding_instructions}</p>
              </div>
            )}
            {stay.belongings && (
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">Pertenencias</p>
                <p className="text-sm text-foreground">{stay.belongings}</p>
              </div>
            )}
            {stay.special_care && (
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">Cuidados especiales</p>
                <p className="text-sm text-foreground">{stay.special_care}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Today's log (in progress only) */}
      {inProgress && (
        <TodayCard visitId={visitId} date={today} log={logByDate.get(today)} onSaved={onDaySaved} />
      )}

      {/* Log table */}
      {days.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {inProgress ? 'Historial' : 'Bitácora'}
          </h3>
          <LogTable
            days={days}
            today={today}
            logByDate={logByDate}
            inProgress={inProgress}
            visitId={visitId}
            onSaved={onDaySaved}
          />
        </section>
      )}

      {/* Check-out section (in progress only) */}
      {inProgress && (
        <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <LogOut size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Check-out</h3>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkout-notes">Notas de salida (opcional)</Label>
            <Textarea
              id="checkout-notes"
              value={checkoutNotes}
              onChange={e => setCheckoutNotes(e.target.value)}
              placeholder="Estado de la mascota al entregar…"
              className="resize-none h-24 bg-muted/30 focus:bg-white transition-all"
            />
          </div>
          <Button onClick={checkOut} disabled={checkingOut} className="gap-2">
            <LogOut size={14} />
            {checkingOut ? 'Procesando…' : 'Realizar check-out'}
          </Button>
        </section>
      )}

      {/* Checkout notes (completed stays) */}
      {isCompleted && stay.notes && (
        <section className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">
            Notas de salida
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{stay.notes}</p>
        </section>
      )}
    </div>
  )
}
