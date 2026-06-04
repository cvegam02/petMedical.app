'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Loader2, TriangleAlert, Stethoscope, Scissors, BedDouble } from 'lucide-react'
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
  initialAppointmentType?: 'consultation' | 'grooming' | 'boarding'
  /** Pre-select a pet and its owner when opening from a pet profile */
  initialPet?: { petId: string; petName: string; ownerId: string; ownerName: string }
}

type Mode = 'registered' | 'first_visit'

export function NewAppointmentModal({ isOpen, onClose, team, businessHours = DEFAULT_BUSINESS_HOURS, initialAppointmentType, initialPet }: NewAppointmentModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('registered')
  const [appointmentType, setAppointmentType] = useState<'consultation' | 'grooming' | 'boarding'>(initialAppointmentType ?? 'consultation')
  const [showSelector, setShowSelector] = useState(!initialAppointmentType)
  const [groomingCatalog, setGroomingCatalog] = useState<{ id: string; name: string; duration_minutes: number | null }[]>([])

  // Load grooming catalog when type is grooming and modal is open
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflictWarning, setConflictWarning] = useState<{ message: string; appointments: { id: string; pet_name: string; owner_name: string }[] } | null>(null)

  // Date/time
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState('')
  // Hotel (boarding): salida planeada (fecha + hora)
  const [exitDate, setExitDate] = useState<Date | undefined>(undefined)
  const [exitTime, setExitTime] = useState('')

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

  const exitSlots = useMemo(() => {
    if (!exitDate) return []
    const config = {
      days: businessHours?.days ?? [1, 2, 3, 4, 5, 6],
      start: businessHours?.start ?? '09:00',
      end: businessHours?.end ?? '18:00',
      slot_interval: businessHours?.slot_interval ?? 30,
    }
    return generateTimeSlots(config, exitDate)
  }, [exitDate, businessHours])

  // Load grooming catalog when type is grooming and modal is open
  useEffect(() => {
    if (!isOpen || appointmentType !== 'grooming') return
    if (groomingCatalog.length > 0) return
    fetch('/api/catalog/grooming-services')
      .then(r => r.json())
      .then(json => setGroomingCatalog((json.data ?? []).filter((s: any) => s.active)))
      .catch(() => {})
  }, [isOpen, appointmentType])

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
    setShowSelector(!initialAppointmentType)
    setSelectedServiceIds([])
    setSelectedDate(undefined)
    setSelectedTime('')
    setExitDate(undefined)
    setExitTime('')
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
    if (appointmentType === 'boarding' && (!exitDate || !exitTime)) {
      toast.error('Fecha y hora de salida son requeridas'); return
    }

    if (mode === 'registered') {
      if (!selectedOwner) { toast.error('Selecciona un dueño'); return }
      if (!selectedPetId) { toast.error('Selecciona una mascota'); return }
    } else {
      if (!petName.trim()) { toast.error('Ingresa el nombre de la mascota'); return }
    }

    setIsSubmitting(true)
    try {
      const scheduledAtISO = combineDateAndTime(selectedDate, selectedTime).toISOString()

      const selectedGroomingServices = appointmentType === 'grooming'
        ? groomingCatalog
            .filter(s => selectedServiceIds.includes(s.id))
            .map(s => ({ service_catalog_id: s.id, service_name: s.name }))
        : []
      const groomingReason = selectedGroomingServices.map(s => s.service_name).join(', ')
      const groomingExtras = appointmentType === 'grooming'
        ? { ...(groomingReason ? { reason: groomingReason } : {}), ...(selectedGroomingServices.length > 0 ? { grooming_services: selectedGroomingServices } : {}) }
        : {}

      const boardingExtras = appointmentType === 'boarding' && exitDate && exitTime
        ? { expected_check_out: combineDateAndTime(exitDate, exitTime).toISOString() }
        : {}

      const url = mode === 'registered' ? '/api/appointments' : '/api/appointments/first-visit'
      const payload = mode === 'registered'
        ? { pet_id: selectedPetId, owner_id: selectedOwner!.id, scheduled_at: scheduledAtISO, service_type: appointmentType, ...(appointmentType === 'consultation' && reason ? { reason } : {}), ...groomingExtras, ...boardingExtras, ...(assignedTo ? { assigned_to: assignedTo } : {}), ...(force ? { force: true } : {}) }
        : { pet_name: petName.trim(), scheduled_at: scheduledAtISO, service_type: appointmentType, ...(appointmentType === 'consultation' && reason ? { reason } : {}), ...groomingExtras, ...boardingExtras, ...(assignedTo ? { assigned_to: assignedTo } : {}), ...(force ? { force: true } : {}) }

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
      // Notify client-side views (e.g. the calendar) that fetch their own data
      window.dispatchEvent(new CustomEvent('appointment:created'))
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
          <DialogTitle>{showSelector ? 'Selecciona un servicio' : 'Nueva cita'}</DialogTitle>
        </DialogHeader>

        {showSelector ? (
          <div className="px-6 py-8">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setAppointmentType('consultation'); setShowSelector(false) }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-center"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Stethoscope size={28} className="text-primary" />
                </div>
                <span className="font-bold text-base">Médico</span>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Consulta, vacunas y revisiones</p>
              </button>

              <button
                type="button"
                onClick={() => { setAppointmentType('grooming'); setShowSelector(false) }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-center"
              >
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Scissors size={28} className="text-blue-600" />
                </div>
                <span className="font-bold text-base">Estético</span>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Baño, corte y peluquería</p>
              </button>

              <button
                type="button"
                onClick={() => { setAppointmentType('boarding'); setShowSelector(false) }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-center"
              >
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BedDouble size={28} className="text-amber-600" />
                </div>
                <span className="font-bold text-base">Hotel</span>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Hospedaje por noche</p>
              </button>

            </div>
          </div>
        ) : (
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
                                skipOwnerSearchRef.current = true
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

              {appointmentType === 'boarding' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Fecha de salida <span className="text-destructive">*</span></Label>
                    <DateInput
                      value={exitDate ? `${exitDate.getFullYear()}-${String(exitDate.getMonth() + 1).padStart(2, '0')}-${String(exitDate.getDate()).padStart(2, '0')}` : undefined}
                      onChange={v => {
                        const d = v ? new Date(v + 'T12:00:00') : undefined
                        setExitDate(d)
                        setExitTime('')
                      }}
                      disabled={(date) => {
                        const today = new Date(); today.setHours(0, 0, 0, 0)
                        return date < today
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Hora de salida <span className="text-destructive">*</span></Label>
                    <Select
                      value={exitTime}
                      onValueChange={v => setExitTime(v ?? '')}
                      disabled={!exitDate || exitSlots.length === 0}
                      items={Object.fromEntries(exitSlots.map(slot => [slot, slot]))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!exitDate ? 'Primero elige fecha' : 'Selecciona hora'} />
                      </SelectTrigger>
                      <SelectContent>
                        {exitSlots.map(slot => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {appointmentType === 'consultation' && (
                <div className="space-y-1">
                  <Label>Motivo (opcional)</Label>
                  <Input
                    placeholder="Motivo de la consulta"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </div>
              )}
              {appointmentType === 'grooming' && (
                <div className="space-y-2">
                  <Label>Servicios</Label>
                  {groomingCatalog.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No hay servicios en el catálogo. Configúralos en Configuración › Servicios.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {groomingCatalog.map(s => {
                        const checked = selectedServiceIds.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              setSelectedServiceIds(prev =>
                                checked ? prev.filter(id => id !== s.id) : [...prev, s.id]
                              )
                            }
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors ${
                              checked
                                ? 'bg-primary/10 border-primary/40 text-primary'
                                : 'border-border text-foreground hover:bg-muted/50'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-primary border-primary' : 'border-border'}`}>
                              {checked && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </span>
                            {s.name}
                            {s.duration_minutes && (
                              <span className="ml-auto text-xs text-muted-foreground shrink-0">{s.duration_minutes}min</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
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
            {!initialAppointmentType && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setShowSelector(true)} 
                disabled={isSubmitting}
                className="mr-auto text-muted-foreground"
              >
                ← Volver
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear cita'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
