'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, PauseCircle, HeartCrack, RotateCcw } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { DateInput } from '@/components/ui/date-input'
import { Button } from '@/components/ui/button'
import type { PetRegistrationStatus } from '@/lib/types/database'

interface PetStatusControlProps {
  petId: string
  initialStatus: PetRegistrationStatus
  initialDateOfDeath: string | null
}

const STATUS_META: Record<PetRegistrationStatus, { label: string; dot: string; text: string }> = {
  active: { label: 'Activo', dot: 'bg-green-500', text: 'text-foreground' },
  inactive: { label: 'Inactivo', dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' },
  deceased: { label: 'Fallecido', dot: 'bg-foreground/60', text: 'text-muted-foreground' },
}

const today = () => new Date().toISOString().slice(0, 10)

export function PetStatusControl({ petId, initialStatus, initialDateOfDeath }: PetStatusControlProps) {
  const router = useRouter()
  const [status, setStatus] = useState<PetRegistrationStatus>(initialStatus)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deathDate, setDeathDate] = useState<string | undefined>(initialDateOfDeath ?? today())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meta = STATUS_META[status]

  async function applyStatus(next: PetRegistrationStatus, dod?: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/pets/${petId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, date_of_death: dod ?? null }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'No se pudo actualizar el estado')
      }
      setStatus(next)
      setMenuOpen(false)
      setDialogOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  function confirmDeceased() {
    if (!deathDate) {
      setError('Selecciona la fecha de fallecimiento')
      return
    }
    applyStatus('deceased', deathDate)
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={(o) => setMenuOpen(o)}>
        <PopoverTrigger
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <span className={meta.text}>{meta.label}</span>
          <ChevronDown size={14} className="text-muted-foreground/50" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 gap-1 p-1.5">
          {status !== 'active' && (
            <MenuItem icon={RotateCcw} label="Reactivar" onClick={() => applyStatus('active')} disabled={loading} />
          )}
          {status === 'active' && (
            <MenuItem icon={PauseCircle} label="Marcar como inactivo" onClick={() => applyStatus('inactive')} disabled={loading} />
          )}
          {status !== 'deceased' && (
            <MenuItem
              icon={HeartCrack}
              label="Marcar como fallecido"
              tone="danger"
              onClick={() => { setMenuOpen(false); setError(null); setDeathDate(initialDateOfDeath ?? today()); setDialogOpen(true) }}
              disabled={loading}
            />
          )}
          {error && <p className="px-2 py-1 text-xs text-destructive">{error}</p>}
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!loading) setDialogOpen(o) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Marcar como fallecido</DialogTitle>
            <DialogDescription>
              Registra la fecha de fallecimiento. La mascota seguirá visible en su expediente, marcada como fallecida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <label className="label-overline text-muted-foreground/60">Fecha de fallecimiento</label>
            <DateInput
              value={deathDate}
              onChange={setDeathDate}
              disabled={(date) => date > new Date()}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-5">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={confirmDeceased} disabled={loading || !deathDate}>
              {loading ? 'Guardando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: typeof RotateCcw
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-50 ${
        tone === 'danger' ? 'text-destructive hover:bg-destructive/10' : 'text-foreground'
      }`}
    >
      <Icon size={15} className="shrink-0" strokeWidth={1.75} />
      {label}
    </button>
  )
}
