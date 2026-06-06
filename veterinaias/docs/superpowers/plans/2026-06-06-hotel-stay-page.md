# Hotel — Pantalla de estadía dedicada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar el flujo de hotel en dos páginas: detalle de cita + check-in (`/hotel/[id]`) y seguimiento operativo de estadía (`/hotel/stay/[id]`) con Hero de mascota.

**Architecture:** `HotelAppointmentDetail` gestiona el pre-checkin (información de cita + formulario). Tras el check-in, `router.push` redirige a la nueva ruta `/hotel/stay/[visitId]` donde `HotelStayPage` muestra el Hero prominente de la mascota y la bitácora operativa. `BoardingStayDetail.tsx` (actualmente huérfano) se elimina.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, shadcn/ui, sonner (toasts)

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| **Crear** | `components/servicios/HotelAppointmentDetail.tsx` |
| **Crear** | `components/servicios/HotelStayPage.tsx` |
| **Crear** | `app/dashboard/servicios/hotel/stay/[id]/page.tsx` |
| **No tocar** | `app/dashboard/servicios/hotel/[id]/page.tsx` — ya importa `HotelAppointmentDetail` y ya redirige a `/stay/${visit.id}` |
| **Eliminar** | `components/servicios/BoardingStayDetail.tsx` — huérfano, no usado por ningún archivo |

---

## Task 1: Crear `HotelAppointmentDetail.tsx`

Gestiona el estado pre-checkin: muestra info de la cita y el formulario de check-in. Tras el check-in exitoso, redirige a `/hotel/stay/[visitId]`.

**Files:**
- Create: `veterinaias/components/servicios/HotelAppointmentDetail.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// veterinaias/components/servicios/HotelAppointmentDetail.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, BedDouble, Clock, Phone, User, Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'

interface Props {
  appointmentId: string
  appointmentStatus: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  appointmentExpectedCheckOut: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null; email: string | null } | null
  assignedTo: { id: string; full_name: string } | null
  scheduledAt: string
}

export function HotelAppointmentDetail({
  appointmentId,
  appointmentStatus,
  appointmentExpectedCheckOut,
  pet,
  owner,
  assignedTo,
  scheduledAt,
}: Props) {
  const router = useRouter()
  const [feeding, setFeeding] = useState('')
  const [belongings, setBelongings] = useState('')
  const [specialCare, setSpecialCare] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const statusCfg = APPOINTMENT_STATUS_CONFIG[appointmentStatus] ?? APPOINTMENT_STATUS_CONFIG.scheduled

  const scheduledDate = new Date(scheduledAt)
  const dateStr = scheduledDate.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = scheduledDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const checkOutStr = appointmentExpectedCheckOut
    ? new Date(appointmentExpectedCheckOut).toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  async function handleTransition(newStatus: string) {
    setActionLoading(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      router.refresh()
    } catch { toast.error('Error de red') } finally { setActionLoading(null) }
  }

  async function handleCheckIn() {
    setActionLoading('checkin')
    try {
      const res = await fetch('/api/servicios/hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointmentId,
          pet_id: pet?.id,
          ...(feeding.trim() ? { feeding_instructions: feeding.trim() } : {}),
          ...(belongings.trim() ? { belongings: belongings.trim() } : {}),
          ...(specialCare.trim() ? { special_care: specialCare.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al hacer check-in'); return }
      toast.success('Check-in registrado')
      const newVisitId = json.data?.id
      if (newVisitId) {
        router.push(`/dashboard/servicios/hotel/stay/${newVisitId}`)
      } else {
        router.refresh()
      }
    } catch { toast.error('Error de red') } finally { setActionLoading(null) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard/servicios/hotel"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver al hotel
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-[1.5px] bg-secondary-foreground/20 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-secondary-foreground uppercase tracking-[0.2em]">
                Reserva de hotel
              </p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{pet?.name ?? '—'}</h1>
            <p className="text-sm text-muted-foreground">{owner?.full_name ?? '—'}</p>
          </div>
          <Badge
            variant="outline"
            className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider border ${statusCfg.className}`}
          >
            {statusCfg.label}
          </Badge>
        </div>
      </div>

      {/* Info de la cita */}
      <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Información de la reserva
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <p className="label-overline text-muted-foreground/50">Fecha de entrada</p>
            <div className="flex items-center gap-2 text-foreground">
              <Calendar size={14} className="text-muted-foreground/40 shrink-0" />
              <span className="capitalize text-sm">{dateStr}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Clock size={14} className="text-muted-foreground/40 shrink-0" />
              <span className="text-sm font-medium tabular-nums">{timeStr}</span>
            </div>
          </div>

          {checkOutStr && (
            <div className="space-y-1.5">
              <p className="label-overline text-muted-foreground/50">Salida esperada</p>
              <div className="flex items-center gap-2 text-foreground">
                <Calendar size={14} className="text-muted-foreground/40 shrink-0" />
                <span className="capitalize text-sm">{checkOutStr}</span>
              </div>
            </div>
          )}

          {owner && (
            <div className="space-y-1.5">
              <p className="label-overline text-muted-foreground/50">Responsable</p>
              <div className="flex items-center gap-2 text-foreground">
                <User size={14} className="text-muted-foreground/40 shrink-0" />
                <span className="text-sm font-medium">{owner.full_name}</span>
              </div>
              {owner.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-muted-foreground/40 shrink-0" />
                  <a href={`tel:${owner.phone}`} className="text-sm text-primary hover:underline tabular-nums">
                    {owner.phone}
                  </a>
                </div>
              )}
            </div>
          )}

          {assignedTo && (
            <div className="space-y-1.5">
              <p className="label-overline text-muted-foreground/50">Atendido por</p>
              <span className="text-sm text-foreground">{assignedTo.full_name}</span>
            </div>
          )}
        </div>
      </section>

      {/* Acción: scheduled */}
      {appointmentStatus === 'scheduled' && (
        <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">La reserva aún no ha sido confirmada.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={() => handleTransition('confirmed')} disabled={actionLoading !== null}>
              {actionLoading === 'confirmed' ? 'Confirmando...' : 'Confirmar reserva'}
            </Button>
            <div className="flex items-center gap-3 text-xs ml-auto">
              <button
                type="button"
                onClick={() => handleTransition('no_show')}
                disabled={actionLoading !== null}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                No se presentó
              </button>
              <span className="text-border">·</span>
              <button
                type="button"
                onClick={() => handleTransition('cancelled')}
                disabled={actionLoading !== null}
                className="text-destructive/60 hover:text-destructive transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Acción: confirmed — formulario de check-in */}
      {appointmentStatus === 'confirmed' && (
        <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-1">Check-in</h3>
            <p className="text-sm text-muted-foreground">
              Completa la información de ingreso y registra el check-in.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="feeding" className="text-[13px] font-bold">Instrucciones de alimentación</Label>
              <Textarea
                id="feeding"
                value={feeding}
                onChange={e => setFeeding(e.target.value)}
                placeholder="Qué, cuánto y cuándo come…"
                className="resize-none h-20 bg-muted/30 focus:bg-white transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="belongings" className="text-[13px] font-bold">Pertenencias</Label>
              <Textarea
                id="belongings"
                value={belongings}
                onChange={e => setBelongings(e.target.value)}
                placeholder="Correa, cobija, juguetes…"
                className="resize-none h-20 bg-muted/30 focus:bg-white transition-all text-sm"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="special-care" className="text-[13px] font-bold">
                Cuidados especiales / medicación
              </Label>
              <Textarea
                id="special-care"
                value={specialCare}
                onChange={e => setSpecialCare(e.target.value)}
                placeholder="Medicamentos, alergias, condiciones…"
                className="resize-none h-20 bg-muted/30 focus:bg-white transition-all text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap pt-2">
            <Button onClick={handleCheckIn} disabled={actionLoading !== null} className="gap-2">
              <BedDouble size={14} />
              {actionLoading === 'checkin' ? 'Procesando...' : 'Registrar check-in'}
            </Button>
            <div className="flex items-center gap-3 text-xs ml-auto">
              <button
                type="button"
                onClick={() => handleTransition('no_show')}
                disabled={actionLoading !== null}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                No se presentó
              </button>
              <span className="text-border">·</span>
              <button
                type="button"
                onClick={() => handleTransition('cancelled')}
                disabled={actionLoading !== null}
                className="text-destructive/60 hover:text-destructive transition-colors disabled:opacity-40"
              >
                Cancelar reserva
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Estado terminal */}
      {(appointmentStatus === 'cancelled' || appointmentStatus === 'no_show') && (
        <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm">
          <p className="text-sm text-muted-foreground">
            {appointmentStatus === 'cancelled'
              ? 'Esta reserva fue cancelada.'
              : 'El cliente no se presentó.'}
          </p>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar que el build no tiene errores de tipo**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```

Si hay errores relacionados con `HotelAppointmentDetail`, corregirlos antes de continuar.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/servicios/HotelAppointmentDetail.tsx
git commit -m "feat: add HotelAppointmentDetail — detail page redirects to stay after check-in"
```

---

## Task 2: Crear `HotelStayPage.tsx`

Pantalla operativa de la estadía. Hero prominente con la mascota + bitácora + checkout.

La API `GET /api/servicios/hotel/[id]` retorna:
```ts
{
  data: {
    id, started_at, ended_at, status, expected_check_out,
    feeding_instructions, belongings, special_care, notes,
    pet: { id, name, species: { name } },
    owner: { id, full_name, phone, email }
  }
}
```

La API `GET /api/servicios/hotel/[id]/daily-logs` retorna:
```ts
{ data: Array<{ id, log_date, notes, fed, walked }> }
```

**Files:**
- Create: `veterinaias/components/servicios/HotelStayPage.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// veterinaias/components/servicios/HotelStayPage.tsx
'use client'
import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, LogOut, Phone, Mail, Clock,
  Save, Cat, Dog, PawPrint, Info,
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

function speciesIcon(name: string | undefined) {
  const s = (name ?? '').toLowerCase()
  if (s.includes('fel') || s.includes('gat')) return Cat
  if (s.includes('can') || s.includes('perr')) return Dog
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
    } catch { toast.error('Error de red.') } finally { setSaving(false) }
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
    } catch { toast.error('Error de red.') } finally { setSaving(false) }
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
        setStay(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [visitId])

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

  function onDaySaved(saved: DailyLog) {
    setLogs(prev => [...prev.filter(l => l.log_date !== saved.log_date), saved])
  }

  // Loading skeleton
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
      <div className="max-w-3xl mx-auto text-center py-24">
        <p className="text-muted-foreground">Estancia no encontrada.</p>
        <Link href="/dashboard/servicios/hotel" className="text-primary hover:underline text-sm mt-2 inline-block">
          Volver al hotel
        </Link>
      </div>
    )
  }

  const inProgress = !!stay.started_at && !stay.ended_at
  const isCompleted = !!stay.ended_at
  const overdue = isCheckoutOverdue(stay.expected_check_out, stay.started_at, stay.ended_at)

  const SpeciesIcon = speciesIcon(stay.pet?.species?.name)

  const statusBadge = isCompleted
    ? { label: 'Finalizada', className: 'text-green-700 bg-green-50 border-green-200' }
    : overdue
    ? { label: 'Salida vencida', className: 'text-orange-600 bg-orange-50 border-orange-200' }
    : { label: 'En curso', className: 'text-amber-700 bg-amber-50 border-amber-200' }

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

  const stripeColor = isCompleted ? 'bg-green-400' : overdue ? 'bg-orange-400' : 'bg-amber-400'
  const dotColor = isCompleted ? 'bg-green-500' : overdue ? 'bg-orange-400' : 'bg-amber-400 animate-pulse'

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Back link */}
      <Link
        href="/dashboard/servicios/hotel"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group"
      >
        <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Volver al hotel
      </Link>

      {/* Hero */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className={`h-1.5 w-full ${stripeColor}`} />
        <div className="p-8">
          <div className="flex items-start gap-6">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-border flex items-center justify-center">
                <SpeciesIcon size={36} strokeWidth={1.5} className="text-primary/30" />
              </div>
              <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${dotColor}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground leading-none">
                    {stay.pet?.name ?? '—'}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {stay.pet?.species?.name ?? 'Especie no definida'}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border shrink-0 ${statusBadge.className}`}
                >
                  {!isCompleted && (
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${dotColor}`} />
                  )}
                  {statusBadge.label}
                </Badge>
              </div>

              {/* Owner */}
              {stay.owner && (
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{stay.owner.full_name}</span>
                  {stay.owner.phone && (
                    <a
                      href={`tel:${stay.owner.phone}`}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline tabular-nums"
                    >
                      <Phone size={12} />
                      {stay.owner.phone}
                    </a>
                  )}
                  {stay.owner.email && (
                    <a
                      href={`mailto:${stay.owner.email}`}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Mail size={12} />
                      {stay.owner.email}
                    </a>
                  )}
                </div>
              )}

              {/* Fechas */}
              <div className="flex items-center gap-6 flex-wrap text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>
                    Ingreso:{' '}
                    <span className="text-foreground font-medium tabular-nums">
                      {fmtDateTime(stay.started_at)}
                    </span>
                  </span>
                </div>
                {(stay.expected_check_out || stay.ended_at) && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>
                      {stay.ended_at ? 'Salida: ' : 'Sale: '}
                      <span className={`font-medium tabular-nums ${overdue && !stay.ended_at ? 'text-orange-600' : 'text-foreground'}`}>
                        {fmtDateTime(stay.ended_at ?? stay.expected_check_out)}
                      </span>
                    </span>
                  </div>
                )}
                {inProgress && (
                  <span className="text-muted-foreground/60">
                    {stayDayLabel(stay.started_at, stay.expected_check_out)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instrucciones de cuidado */}
      {(stay.feeding_instructions || stay.belongings || stay.special_care) && (
        <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Instrucciones de cuidado
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {stay.feeding_instructions && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">Alimentación</p>
                <p className="text-sm text-foreground">{stay.feeding_instructions}</p>
              </div>
            )}
            {stay.belongings && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">Pertenencias</p>
                <p className="text-sm text-foreground">{stay.belongings}</p>
              </div>
            )}
            {stay.special_care && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">Cuidados especiales</p>
                <p className="text-sm text-foreground">{stay.special_care}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tarjeta de hoy (solo si en curso) */}
      {inProgress && (
        <TodayCard visitId={visitId} date={today} log={logByDate.get(today)} onSaved={onDaySaved} />
      )}

      {/* Bitácora histórica */}
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

      {/* Check-out (solo si en curso) */}
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

      {/* Estado completado */}
      {isCompleted && stay.notes && (
        <section className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-2">
          <p className="text-xs text-muted-foreground/50 font-medium uppercase tracking-wider">Notas de salida</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{stay.notes}</p>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/servicios/HotelStayPage.tsx
git commit -m "feat: add HotelStayPage — hero + bitácora + checkout for boarding stays"
```

---

## Task 3: Crear la ruta `/hotel/stay/[id]`

Servidor simple que renderiza `HotelStayPage` con el `visitId` de la URL.

**Files:**
- Create: `veterinaias/app/dashboard/servicios/hotel/stay/[id]/page.tsx`

- [ ] **Step 1: Crear el directorio y el archivo**

```bash
mkdir -p veterinaias/app/dashboard/servicios/hotel/stay/\[id\]
```

- [ ] **Step 2: Crear la página**

```tsx
// veterinaias/app/dashboard/servicios/hotel/stay/[id]/page.tsx
import { HotelStayPage } from '@/components/servicios/HotelStayPage'

export default async function HotelStayRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <HotelStayPage visitId={id} />
}
```

- [ ] **Step 3: Verificar el build de Next.js**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add veterinaias/app/dashboard/servicios/hotel/stay/
git commit -m "feat: add /hotel/stay/[id] route — dedicated boarding stay tracking page"
```

---

## Task 4: Eliminar `BoardingStayDetail.tsx`

El componente está huérfano — ningún archivo lo importa. Se puede eliminar de forma segura.

**Files:**
- Delete: `veterinaias/components/servicios/BoardingStayDetail.tsx`

- [ ] **Step 1: Confirmar que nadie lo importa**

```bash
grep -r "BoardingStayDetail" veterinaias --include="*.tsx" --include="*.ts" | grep -v "BoardingStayDetailModal"
```

Expected output: ninguna línea (o solo la definición en el propio archivo). Si aparece algún import, NO eliminar y reportar el archivo que lo usa.

- [ ] **Step 2: Eliminar el archivo**

```bash
rm veterinaias/components/servicios/BoardingStayDetail.tsx
```

- [ ] **Step 3: Verificar build limpio**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -20
```

Expected: sin errores relacionados con `BoardingStayDetail`.

- [ ] **Step 4: Commit**

```bash
git add -u veterinaias/components/servicios/BoardingStayDetail.tsx
git commit -m "chore: remove orphaned BoardingStayDetail — replaced by HotelAppointmentDetail + HotelStayPage"
```

---

## Verificación final

Flujo a probar manualmente en el navegador:

1. Ir a `/dashboard/servicios/hotel`
2. Hacer click en una reserva `confirmed` del calendario
3. Hacer click en "Ver detalle de hotel" en el side panel → debe llegar a `/hotel/[appointmentId]` con el formulario de check-in
4. Llenar los campos (alimentación, pertenencias, cuidados) y click en "Registrar check-in"
5. Debe redirigir automáticamente a `/hotel/stay/[visitId]` con el Hero mostrando la mascota
6. Verificar que la tarjeta de hoy está visible y la bitácora funciona
7. Realizar check-out → debe redirigir a `/dashboard/servicios/hotel`

Flujo alternativo — reserva ya en curso (via listing o dashboard):
- Navegar a `/hotel/[appointmentId]` donde ya existe una visita → debe redirigir automáticamente a `/hotel/stay/[visitId]` (lógica ya existente en `[id]/page.tsx`)
