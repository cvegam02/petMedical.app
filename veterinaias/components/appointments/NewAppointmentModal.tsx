'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DateInput } from '@/components/ui/date-input'
import { generateTimeSlots, combineDateAndTime, BusinessHoursConfig, DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'

interface TeamMember { id: string; full_name: string }

export interface NewAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  team: TeamMember[]
  businessHours?: BusinessHoursConfig
  /** Pre-select a service type when opening from a service CTA */
  initialAppointmentType?: 'consultation' | 'grooming'
  /** Pre-select a pet and its owner when opening from a pet profile */
  initialPet?: { petId: string; petName: string; ownerId: string; ownerName: string }
}

type Mode = 'registered' | 'first_visit'

export function NewAppointmentModal({ isOpen, onClose, team, businessHours = DEFAULT_BUSINESS_HOURS, initialAppointmentType, initialPet }: NewAppointmentModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('registered')
  const [appointmentType, setAppointmentType] = useState<'consultation' | 'grooming'>(initialAppointmentType ?? 'consultation')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflictWarning, setConflictWarning] = useState<{ message: string; appointments: { id: string; pet_name: string; owner_name: string }[] } | null>(null)

  // Date/time
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState('')

  // Shared fields
  const [reason, setReason] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  // Registered mode
  const [ownerQuery, setOwnerQuery] = useState('')
  const [ownerResults, setOwnerResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; full_name: string } | null>(null)
  const [pets, setPets] = useState<{ id: string; name: string; species: { name: string } | null }[]>([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearchingOwner, setIsSearchingOwner] = useState(false)
  const [isLoadingPets, setIsLoadingPets] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const preloadedRef = useRef(false)
  // Prevents the owner-search debounce from firing during programmatic pre-load
  const skipOwnerSearchRef = useRef(false)
  // When true, the selectedOwner effect skips fetching pets (pre-load handles it)
  const skipPetFetchRef = useRef(false)

  // First visit mode
  const [petName, setPetName] = useState('')

  const timeSlots = useMemo(() => {
    if (!selectedDate) return []
    // Ensure we have all required fields for generateTimeSlots
    const config = {
      days: businessHours?.days ?? [1, 2, 3, 4, 5, 6],
      start: businessHours?.start ?? '09:00',
      end: businessHours?.end ?? '18:00',
      slot_interval: businessHours?.slot_interval ?? 30
    }
    return generateTimeSlots(config, selectedDate)
  }, [selectedDate, businessHours])

  // Owner search debounce
  useEffect(() => {
    if (ownerQuery.length < 1) return
    if (skipOwnerSearchRef.current) { skipOwnerSearchRef.current = false; return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setIsSearchingOwner(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/owners?q=${encodeURIComponent(ownerQuery)}`)
        const json = await res.json()
        setOwnerResults(json.data ?? [])
        setShowSuggestions(true)
      } catch {
        setOwnerResults([])
      } finally {
        setIsSearchingOwner(false)
      }
    }, 150)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [ownerQuery])

  // Load pets when owner is selected (skipped when pre-load handles it directly)
  useEffect(() => {
    if (!selectedOwner) { setPets([]); return }
    if (skipPetFetchRef.current) { skipPetFetchRef.current = false; return }
    setIsLoadingPets(true)
    fetch(`/api/pets?ownerId=${selectedOwner.id}`)
      .then(r => r.json())
      .then(json => { setPets(json.data ?? []); setSelectedPetId('') })
      .catch(() => setPets([]))
      .finally(() => setIsLoadingPets(false))
  }, [selectedOwner])

  async function preloadOwners() {
    if (preloadedRef.current) { setShowSuggestions(true); return }
    preloadedRef.current = true
    setIsSearchingOwner(true)
    try {
      const res = await fetch('/api/owners?limit=5')
      const json = await res.json()
      setOwnerResults(json.data ?? [])
      setShowSuggestions(true)
    } catch {
      setOwnerResults([])
    } finally {
      setIsSearchingOwner(false)
    }
  }

  function reset() {
    setMode('registered')
    setAppointmentType(initialAppointmentType ?? 'consultation')
    setSelectedDate(undefined)
    setSelectedTime('')
    setReason('')
    setAssignedTo('')
    setOwnerQuery('')
    setOwnerResults([])
    setSelectedOwner(null)
    setPets([])
    setSelectedPetId('')
    setPetName('')
    setShowSuggestions(false)
    setIsSearchingOwner(false)
    setIsLoadingPets(false)
    setConflictWarning(null)
    preloadedRef.current = false
    skipOwnerSearchRef.current = false
    skipPetFetchRef.current = false
  }

  function handleClose() {
    reset()
    onClose()
  }

  // Pre-load pet and owner when opened from a pet profile CTA
  useEffect(() => {
    if (!isOpen || !initialPet) return
    // Block the owner-search debounce and the selectedOwner→pet-fetch effect
    skipOwnerSearchRef.current = true
    skipPetFetchRef.current = true
    setMode('registered')
    setAppointmentType(initialAppointmentType ?? 'consultation')
    setSelectedOwner({ id: initialPet.ownerId, full_name: initialPet.ownerName })
    setOwnerQuery(initialPet.ownerName)
    setShowSuggestions(false)
    // Fetch pets directly — don't rely on the selectedOwner effect chain
    setIsLoadingPets(true)
    fetch(`/api/pets?ownerId=${initialPet.ownerId}`)
      .then(r => r.json())
      .then(json => {
        setPets(json.data ?? [])
        setSelectedPetId(initialPet.petId)
      })
      .catch(() => setPets([]))
      .finally(() => setIsLoadingPets(false))
  }, [isOpen, initialPet?.petId, initialAppointmentType])

  async function submitAppointment(force = false) {
    if (!selectedDate || !selectedTime) { toast.error('Fecha y hora son requeridas'); return }

    if (mode === 'registered') {
      if (!selectedOwner) { toast.error('Selecciona un dueño'); return }
      if (!selectedPetId) { toast.error('Selecciona una mascota'); return }
    } else {
      if (!petName.trim()) { toast.error('Ingresa el nombre de la mascota'); return }
    }

    setIsSubmitting(true)
    try {
      const scheduledAtISO = combineDateAndTime(selectedDate, selectedTime).toISOString()

      const url = mode === 'registered' ? '/api/appointments' : '/api/appointments/first-visit'
      const payload = mode === 'registered'
        ? { pet_id: selectedPetId, owner_id: selectedOwner!.id, scheduled_at: scheduledAtISO, appointment_type: appointmentType, ...(reason ? { reason } : {}), ...(assignedTo ? { assigned_to: assignedTo } : {}), ...(force ? { force: true } : {}) }
        : { pet_name: petName.trim(), scheduled_at: scheduledAtISO, appointment_type: appointmentType, ...(reason ? { reason } : {}), ...(assignedTo ? { assigned_to: assignedTo } : {}), ...(force ? { force: true } : {}) }

      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()

      if (res.status === 409 && json.conflict) {
        setConflictWarning({ message: json.message, appointments: json.appointments })
        return
      }

      if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }

      setConflictWarning(null)
      toast.success('Cita creada')
      handleClose()
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setConflictWarning(null)
    await submitAppointment(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Nueva cita</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 pt-5 pb-2 space-y-6">
            {/* Service type */}
            <div className="space-y-1">
              <Label>Tipo de servicio</Label>
              <Select
                value={appointmentType}
                onValueChange={v => setAppointmentType(v as 'consultation' | 'grooming')}
                items={{ consultation: 'Médico', grooming: 'Estético' }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Médico</SelectItem>
                  <SelectItem value="grooming">Estético</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        {isSearchingOwner
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Search size={14} />
                        }
                      </span>
                      <Input
                        id="owner_search"
                        value={ownerQuery}
                        onChange={e => {
                          setOwnerQuery(e.target.value)
                          setSelectedOwner(null)
                          setSelectedPetId('')
                        }}
                        onFocus={preloadOwners}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="Buscar por nombre o teléfono..."
                        autoComplete="off"
                        className="pl-9"
                      />
                    </div>
                    {showSuggestions && ownerResults.length > 0 && (
                      <ul className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                        {ownerResults.map(o => (
                          <li key={o.id}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
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
                      disabled={!selectedOwner || isLoadingPets || pets.length === 0}
                      items={Object.fromEntries(pets.map(p => [
                        p.id,
                        `${p.name}${p.species ? ` (${p.species.name})` : ''}`
                      ]))}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedOwner
                              ? 'Selecciona un dueño primero'
                              : isLoadingPets
                              ? 'Cargando mascotas...'
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
              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha <span className="text-destructive">*</span></Label>
                  <DateInput
                    value={selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : undefined}
                    onChange={v => {
                      const d = v ? new Date(v + 'T12:00:00') : undefined
                      setSelectedDate(d)
                      setSelectedTime('')
                    }}
                    disabled={(date) => {
                      const today = new Date(); today.setHours(0, 0, 0, 0)
                      const availableDays = businessHours?.days ?? [1, 2, 3, 4, 5, 6]
                      return date < today || !availableDays.includes(date.getDay())
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Hora <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedTime}
                    onValueChange={v => { setSelectedTime(v ?? ''); setConflictWarning(null) }}
                    disabled={!selectedDate || timeSlots.length === 0}
                    items={Object.fromEntries(timeSlots.map(slot => [slot, slot]))}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={!selectedDate ? 'Primero elige fecha' : 'Selecciona hora'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(slot => (
                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Motivo (opcional)</Label>
                <Input
                  placeholder="Motivo de la cita"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
              {team.length > 0 && (
                <div className="space-y-1">
                  <Label>Asignar a</Label>
                  <Select
                    value={assignedTo}
                    onValueChange={v => setAssignedTo(v ?? '')}
                    items={{ "": "Sin asignar", ...Object.fromEntries(team.map(m => [m.id, m.full_name])) }}
                  >
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

          {/* Conflict warning */}
          {conflictWarning && (
            <div className="mx-6 mb-2 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <TriangleAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-900">{conflictWarning.message}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {conflictWarning.appointments.map(a => (
                      <li key={a.id} className="text-xs text-amber-700">
                        · {a.pet_name} — {a.owner_name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => submitAppointment(true)}
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white border-0"
                >
                  {isSubmitting ? 'Agendando...' : 'Agendar de todas formas'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConflictWarning(null)}
                  className="border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  Elegir otra hora
                </Button>
              </div>
            </div>
          )}

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
      </DialogContent>
    </Dialog>
  )
}
