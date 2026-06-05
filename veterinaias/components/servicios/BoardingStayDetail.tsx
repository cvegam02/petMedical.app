'use client'
import { useEffect, useState, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, LogOut, Phone, Mail, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { isCheckoutOverdue, stayDays, stayDayLabel, remainingDaysLabel } from '@/lib/utils/boarding'
import { ServiceLifecycleBar } from './ServiceLifecycleBar'

interface Stay {
  id: string
  status: string
  started_at: string | null
  ended_at: string | null
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
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
    <div className="bg-card rounded-xl border border-border p-5 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
        <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Hoy</p>
      </div>
      <h2 className="text-lg font-bold text-foreground capitalize mb-4">{dateFormatted}</h2>
      <div className="space-y-3">
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notas del día…"
          className="resize-none h-16 text-sm"
        />
        <div className="flex items-center gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={fed} onChange={e => setFed(e.target.checked)} />
            <span>Alimentó</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={walked} onChange={e => setWalked(e.target.checked)} />
            <span>Paseó</span>
          </label>
          <Button size="sm" variant="outline" className="ml-auto" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
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
  days: string[]; today: string; logByDate: Map<string, DailyLog>; inProgress: boolean; visitId: string; onSaved: (l: DailyLog) => void
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

interface Props {
  visitId: string
  appointmentId?: string | null
  appointmentStatus?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | null
  serviceVisitStartedAt?: string | null
}

export function BoardingStayDetail({ visitId, appointmentId, appointmentStatus, serviceVisitStartedAt }: Props) {
  const router = useRouter()
  const [stay, setStay] = useState<Stay | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)
  const [ownerOpen, setOwnerOpen] = useState(false)

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

  useEffect(() => { load() }, [visitId])

  async function checkOut() {
    if (!stay) return
    setCheckingOut(true)
    try {
      const res = await fetch(`/api/servicios/hotel/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ended_at: new Date().toISOString(), ...(checkoutNotes.trim() ? { notes: checkoutNotes.trim() } : {}) }),
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

  async function handleCheckIn() {
    if (!appointmentId) return
    try {
      const res = await fetch('/api/servicios/hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: appointmentId }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al hacer check-in'); return }
      toast.success('Check-in registrado')
      router.refresh()
    } catch { toast.error('Error de red') }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-10">
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
      </div>
    )
  }
  if (!stay) {
    return (
      <div className="max-w-4xl mx-auto pb-10">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard/servicios/hotel" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={14} />
            Hotel
          </Link>
        </div>
        {appointmentId && appointmentStatus && (
          <div className="mb-6">
            <ServiceLifecycleBar
              appointmentId={appointmentId}
              appointmentStatus={appointmentStatus}
              serviceType="boarding"
              serviceStartedAt={serviceVisitStartedAt ?? null}
              onInitiate={handleCheckIn}
            />
          </div>
        )}
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">
            {appointmentId ? 'Pendiente de check-in' : 'Estancia no encontrada'}
          </p>
        </div>
      </div>
    )
  }

  const inProgress = !!stay.started_at && !stay.ended_at
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

  function onDaySaved(saved: DailyLog) {
    setLogs(prev => {
      const rest = prev.filter(l => l.log_date !== saved.log_date)
      return [...rest, saved]
    })
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/dashboard/servicios/hotel"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          Hotel
        </Link>
      </div>

      {/* Lifecycle bar */}
      {appointmentId && appointmentStatus && (
        <div className="mb-6">
          <ServiceLifecycleBar
            appointmentId={appointmentId}
            appointmentStatus={appointmentStatus}
            serviceType="boarding"
            serviceStartedAt={serviceVisitStartedAt ?? stay?.started_at}
            onInitiate={handleCheckIn}
          />
        </div>
      )}

      {/* Hero card */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Hotel</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{stay.pet?.name ?? '—'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {stay.pet?.species?.name ?? 'Estancia de hotel'}
            </p>
            {stay.owner && (
              <button
                onClick={() => setOwnerOpen(true)}
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <User size={12} />
                {stay.owner.full_name}
              </button>
            )}
          </div>
          {!inProgress ? (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border text-green-700 bg-green-50 border-green-200 shrink-0">Finalizada</span>
          ) : overdue ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border text-orange-600 bg-orange-50 border-orange-200 shrink-0">Salida vencida</span>
          ) : (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200 shrink-0">En curso</span>
          )}
        </div>

        {/* Fechas */}
        <div className="mb-4">
          <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-2">Fechas</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Entrada</p>
              <p className="text-sm text-foreground mt-0.5">{fmtDateTime(stay.started_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stay.ended_at ? 'Salida' : 'Salida esperada'}</p>
              <p className="text-sm text-foreground mt-0.5">{fmtDateTime(stay.ended_at ?? stay.expected_check_out)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duración</p>
              <p className="text-sm text-foreground mt-0.5">{stayDayLabel(stay.started_at, stay.expected_check_out)}</p>
            </div>
          </div>
        </div>

        {/* Recepción */}
        <div className="mt-4 pt-4 border-t border-border/60">
          <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-2">Recepción</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Alimentación</p>
              <p className="text-sm text-foreground mt-0.5">{stay.feeding_instructions || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pertenencias</p>
              <p className="text-sm text-foreground mt-0.5">{stay.belongings || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cuidados</p>
              <p className="text-sm text-foreground mt-0.5">{stay.special_care || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hoy — solo si la estancia está en curso */}
      {inProgress && (
        <TodayCard visitId={visitId} date={today} log={logByDate.get(today)} onSaved={onDaySaved} />
      )}

      {/* Bitácora / historial */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">
          {inProgress ? 'Historial' : 'Bitácora'}
        </p>
      </div>
      <LogTable days={days} today={today} logByDate={logByDate} inProgress={inProgress} visitId={visitId} onSaved={onDaySaved} />

      {/* Check-out */}
      {inProgress && (
        <div className="mt-8 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Check-out</p>
            </div>
            <Label className="text-[13px] font-bold">Notas de salida (opcional)</Label>
            <Textarea value={checkoutNotes} onChange={e => setCheckoutNotes(e.target.value)} className="resize-none h-16 text-sm bg-muted/30 focus:bg-white transition-all" placeholder="Estado al entregar…" />
          </div>
          <div className="px-5 py-4 bg-muted/20 flex items-center gap-4 border-t border-border/60">
            <Button size="lg" onClick={checkOut} disabled={checkingOut} className="shadow-md shadow-primary/20">
              {checkingOut ? 'Procesando…' : (
                <>
                  <LogOut size={16} className="mr-2" />
                  Check-out
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {!inProgress && stay.notes && (
        <div className="mt-6">
          <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1.5">Notas de salida</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{stay.notes}</p>
        </div>
      )}

      {stay.owner && (
        <Dialog open={ownerOpen} onOpenChange={setOwnerOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Contacto de emergencia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Responsable</p>
                <p className="text-sm font-medium text-foreground">{stay.owner.full_name}</p>
              </div>
              {stay.owner.phone && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Teléfono</p>
                  <a href={`tel:${stay.owner.phone}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <Phone size={13} />
                    {stay.owner.phone}
                  </a>
                </div>
              )}
              {stay.owner.email && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Email</p>
                  <a href={`mailto:${stay.owner.email}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <Mail size={13} />
                    {stay.owner.email}
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
