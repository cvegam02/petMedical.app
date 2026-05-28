'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TeamMember { id: string; full_name: string }

export interface NewAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  team: TeamMember[]
}

type Mode = 'registered' | 'first_visit'

export function NewAppointmentModal({ isOpen, onClose, team }: NewAppointmentModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('registered')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Shared fields
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [reason, setReason] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  // Registered mode
  const [ownerQuery, setOwnerQuery] = useState('')
  const [ownerResults, setOwnerResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; full_name: string } | null>(null)
  const [pets, setPets] = useState<{ id: string; name: string; species: { name: string } | null }[]>([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // First visit mode
  const [petName, setPetName] = useState('')

  const modalRef = useRef<HTMLDivElement>(null)

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus modal on open
  useEffect(() => {
    if (isOpen) modalRef.current?.focus()
  }, [isOpen])

  // Owner search debounce
  useEffect(() => {
    if (ownerQuery.length < 2) { setOwnerResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/owners?q=${encodeURIComponent(ownerQuery)}`)
        const json = await res.json()
        setOwnerResults(json.data ?? [])
        setShowSuggestions(true)
      } catch {
        setOwnerResults([])
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [ownerQuery])

  // Load pets when owner is selected
  useEffect(() => {
    if (!selectedOwner) { setPets([]); return }
    fetch(`/api/pets?ownerId=${selectedOwner.id}`)
      .then(r => r.json())
      .then(json => setPets(json.data ?? []))
      .catch(() => setPets([]))
  }, [selectedOwner])

  function reset() {
    setMode('registered')
    setScheduledAt('')
    setDurationMinutes(30)
    setReason('')
    setAssignedTo('')
    setOwnerQuery('')
    setOwnerResults([])
    setSelectedOwner(null)
    setPets([])
    setSelectedPetId('')
    setPetName('')
    setShowSuggestions(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduledAt) { toast.error('Fecha y hora son requeridas'); return }

    if (mode === 'registered') {
      if (!selectedOwner) { toast.error('Selecciona un dueño'); return }
      if (!selectedPetId) { toast.error('Selecciona una mascota'); return }
    } else {
      if (!petName.trim()) { toast.error('Ingresa el nombre de la mascota'); return }
    }

    setIsSubmitting(true)
    try {
      const scheduledAtISO = new Date(scheduledAt).toISOString()

      if (mode === 'registered') {
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pet_id: selectedPetId,
            owner_id: selectedOwner!.id,
            scheduled_at: scheduledAtISO,
            duration_minutes: durationMinutes,
            ...(reason ? { reason } : {}),
            ...(assignedTo ? { assigned_to: assignedTo } : {}),
          }),
        })
        const json = await res.json()
        if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      } else {
        const res = await fetch('/api/appointments/first-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pet_name: petName.trim(),
            scheduled_at: scheduledAtISO,
            duration_minutes: durationMinutes,
            ...(reason ? { reason } : {}),
            ...(assignedTo ? { assigned_to: assignedTo } : {}),
          }),
        })
        const json = await res.json()
        if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      }

      toast.success('Cita creada')
      handleClose()
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Nueva cita"
        tabIndex={-1}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Nueva cita</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 pt-5 pb-2 space-y-6">
            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                type="button"
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                  mode === 'registered'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setMode('registered')}
              >
                Cliente registrado
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                  mode === 'first_visit'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setMode('first_visit')}
              >
                Primera visita
              </button>
            </div>

            {/* Patient fields */}
            <div className="space-y-4">
              {mode === 'registered' ? (
                <>
                  <div className="relative space-y-1">
                    <Label htmlFor="owner_search">Dueño <span className="text-destructive">*</span></Label>
                    <Input
                      id="owner_search"
                      value={ownerQuery}
                      onChange={e => {
                        setOwnerQuery(e.target.value)
                        setSelectedOwner(null)
                        setSelectedPetId('')
                      }}
                      onFocus={() => ownerResults.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Buscar por nombre o teléfono..."
                      autoComplete="off"
                    />
                    {showSuggestions && ownerResults.length > 0 && (
                      <ul className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                        {ownerResults.map(o => (
                          <li key={o.id}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                              onMouseDown={() => {
                                setSelectedOwner(o)
                                setOwnerQuery(o.full_name)
                                setShowSuggestions(false)
                                setSelectedPetId('')
                              }}
                            >
                              <span className="font-medium">{o.full_name}</span>
                              {o.phone && (
                                <span className="text-muted-foreground ml-2">{o.phone}</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Mascota <span className="text-destructive">*</span></Label>
                    <Select
                      value={selectedPetId}
                      onValueChange={v => setSelectedPetId(v ?? '')}
                      disabled={!selectedOwner || pets.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedOwner
                              ? 'Selecciona un dueño primero'
                              : pets.length === 0
                              ? 'Sin mascotas registradas'
                              : 'Selecciona una mascota'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {pets.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}{p.species ? ` (${p.species.name})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="pet_name">
                    Nombre de la mascota <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="pet_name"
                    value={petName}
                    onChange={e => setPetName(e.target.value)}
                    placeholder="Ej. Luna, Max, Pelusa..."
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Los datos del dueño y perfil completo se llenan durante la consulta.
                  </p>
                </div>
              )}
            </div>

            {/* Shared fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="scheduled_at">
                    Fecha y hora <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Duración</Label>
                  <Select
                    value={String(durationMinutes)}
                    onValueChange={v => setDurationMinutes(Number(v))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="90">1.5 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="reason">Motivo</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ej. Consulta general, vacunación..."
                />
              </div>
              {team.length > 0 && (
                <div className="space-y-1">
                  <Label>Asignar a</Label>
                  <Select value={assignedTo} onValueChange={v => setAssignedTo(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin asignar</SelectItem>
                      {team.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 mt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear cita'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
