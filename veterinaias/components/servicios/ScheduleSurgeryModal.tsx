'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Syringe, Search, Loader2, User, ClipboardList, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormSection } from '@/components/ui/form-section'
import { DateInput } from '@/components/ui/date-input'
import { AttendingVetField, type TenantVet } from '@/components/medical-records/AttendingVetField'
import { generateTimeSlots, combineDateAndTime, DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

const ANESTHESIA_OPTIONS = ['General', 'Sedación', 'Local'] as const

interface Props {
  isOpen: boolean
  onClose: () => void
  team: TenantVet[]
  businessHours?: BusinessHoursConfig
}

export function ScheduleSurgeryModal({ isOpen, onClose, team, businessHours = DEFAULT_BUSINESS_HOURS }: Props) {
  // Patient selection
  const [ownerQuery, setOwnerQuery] = useState('')
  const [ownerResults, setOwnerResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; full_name: string } | null>(null)
  const [pets, setPets] = useState<{ id: string; name: string }[]>([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearchingOwner, setIsSearchingOwner] = useState(false)
  const [isLoadingPets, setIsLoadingPets] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Date/time
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState('')

  // Vet
  const [attendedBy, setAttendedBy] = useState('')

  // Pre-op fields
  const [diagnosis, setDiagnosis] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [preOpNotes, setPreOpNotes] = useState('')
  const [anesthesiaType, setAnesthesiaType] = useState('')
  const [anesthesiaNotes, setAnesthesiaNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const timeSlots = useMemo(() => {
    if (!selectedDate) return []
    return generateTimeSlots({
      days: businessHours?.days ?? [1, 2, 3, 4, 5, 6],
      start: businessHours?.start ?? '09:00',
      end: businessHours?.end ?? '18:00',
      slot_interval: businessHours?.slot_interval ?? 30,
    }, selectedDate)
  }, [selectedDate, businessHours])

  // Owner search debounce
  useEffect(() => {
    if (ownerQuery.length < 1) return
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

  // Fetch pets when owner is selected
  useEffect(() => {
    if (!selectedOwner) { setPets([]); setSelectedPetId(''); return }
    setIsLoadingPets(true)
    fetch(`/api/pets?ownerId=${selectedOwner.id}`)
      .then(r => r.json())
      .then(json => { setPets(json.data ?? []); setSelectedPetId('') })
      .catch(() => setPets([]))
      .finally(() => setIsLoadingPets(false))
  }, [selectedOwner])

  async function preloadOwners() {
    if (ownerResults.length > 0) { setShowSuggestions(true); return }
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
    setOwnerQuery('')
    setOwnerResults([])
    setSelectedOwner(null)
    setPets([])
    setSelectedPetId('')
    setShowSuggestions(false)
    setIsSearchingOwner(false)
    setIsLoadingPets(false)
    setSelectedDate(undefined)
    setSelectedTime('')
    setAttendedBy('')
    setDiagnosis('')
    setWeightKg('')
    setPreOpNotes('')
    setAnesthesiaType('')
    setAnesthesiaNotes('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedOwner) { toast.error('Selecciona un dueño'); return }
    if (!selectedPetId) { toast.error('Selecciona una mascota'); return }
    if (!selectedDate || !selectedTime) { toast.error('Fecha y hora son requeridas'); return }
    if (!attendedBy) { toast.error('Selecciona el veterinario asignado'); return }

    setIsSubmitting(true)
    try {
      const scheduledAt = combineDateAndTime(selectedDate, selectedTime).toISOString()
      const res = await fetch('/api/servicios/cirugia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: selectedPetId,
          owner_id: selectedOwner.id,
          scheduled_at: scheduledAt,
          attended_by: attendedBy,
          ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
          ...(weightKg ? { weight_kg: parseFloat(weightKg) } : {}),
          ...(preOpNotes.trim() ? { pre_op_notes: preOpNotes.trim() } : {}),
          ...(anesthesiaType ? { anesthesia_type: anesthesiaType } : {}),
          ...(anesthesiaNotes.trim() ? { anesthesia_notes: anesthesiaNotes.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al agendar'); return }
      toast.success('Cirugía agendada')
      handleClose()
      window.dispatchEvent(new CustomEvent('appointment:created'))
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Syringe size={18} className="text-rose-500" />
            Nueva cirugía
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* ── Paciente y reserva ── */}
          <FormSection title={
            <div className="flex items-center gap-2">
              <User size={14} className="text-primary/60" />
              <span>Paciente y reserva</span>
            </div>
          }>
            {/* Owner search */}
            <div className="space-y-1.5 relative">
              <Label htmlFor="owner_search" className="text-[13px] font-bold">
                Dueño <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="owner_search"
                  value={ownerQuery}
                  onChange={e => {
                    setOwnerQuery(e.target.value)
                    if (selectedOwner) { setSelectedOwner(null); setSelectedPetId('') }
                  }}
                  onFocus={preloadOwners}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Buscar dueño..."
                  className="pl-8 bg-muted/30 focus:bg-white transition-all"
                  autoComplete="off"
                />
                {isSearchingOwner && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {showSuggestions && ownerResults.length > 0 && (
                <div className="absolute z-50 w-full top-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  {ownerResults.map(o => (
                    <button
                      key={o.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors"
                      onMouseDown={() => {
                        setSelectedOwner({ id: o.id, full_name: o.full_name })
                        setOwnerQuery(o.full_name)
                        setShowSuggestions(false)
                      }}
                    >
                      <span className="font-medium">{o.full_name}</span>
                      {o.phone && <span className="text-muted-foreground ml-2 text-xs">{o.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pet selector */}
            <div className="space-y-1.5 mt-4">
              <Label className="text-[13px] font-bold">
                Mascota <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedPetId}
                onValueChange={setSelectedPetId}
                disabled={!selectedOwner || isLoadingPets}
              >
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder={
                    !selectedOwner ? 'Primero selecciona un dueño' :
                    isLoadingPets ? 'Cargando...' :
                    pets.length === 0 ? 'Sin mascotas registradas' :
                    'Selecciona una mascota'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {pets.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">
                  Fecha <span className="text-destructive">*</span>
                </Label>
                <DateInput value={selectedDate} onChange={setSelectedDate} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">
                  Hora <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedTime}
                  onValueChange={setSelectedTime}
                  disabled={!selectedDate || timeSlots.length === 0}
                >
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder={!selectedDate ? 'Elige fecha primero' : 'Hora'} />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vet */}
            <div className="mt-4">
              <AttendingVetField
                vets={team}
                value={attendedBy}
                onChange={setAttendedBy}
                currentVetId=""
              />
            </div>
          </FormSection>

          {/* ── Pre-operatorio ── */}
          <FormSection title={
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className="text-primary/60" />
              <span>Pre-operatorio</span>
            </div>
          }>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="diagnosis" className="text-[13px] font-bold">Diagnóstico / motivo</Label>
                <Input
                  id="diagnosis"
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  placeholder="Motivo de la cirugía"
                  className="bg-muted/30 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight_kg" className="text-[13px] font-bold">Peso (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.01"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  placeholder="ej. 12.5"
                  className="bg-muted/30 focus:bg-white transition-all font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pre_op_notes" className="text-[13px] font-bold">Notas pre-op</Label>
                <Textarea
                  id="pre_op_notes"
                  value={preOpNotes}
                  onChange={e => setPreOpNotes(e.target.value)}
                  placeholder="Ayuno, estado, riesgos..."
                  className="resize-none h-16 bg-muted/30 focus:bg-white transition-all"
                />
              </div>
            </div>
          </FormSection>

          {/* ── Anestesia ── */}
          <FormSection title={
            <div className="flex items-center gap-2">
              <Syringe size={14} className="text-primary/60" />
              <span>Anestesia</span>
            </div>
          }>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">Tipo de anestesia</Label>
                <Select value={anesthesiaType} onValueChange={setAnesthesiaType}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANESTHESIA_OPTIONS.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="anesthesia_notes" className="text-[13px] font-bold">Notas / protocolo</Label>
                <Textarea
                  id="anesthesia_notes"
                  value={anesthesiaNotes}
                  onChange={e => setAnesthesiaNotes(e.target.value)}
                  placeholder="Agentes, manejo anestésico..."
                  className="resize-none h-16 bg-muted/30 focus:bg-white transition-all"
                />
              </div>
            </div>
          </FormSection>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Agendando...' : 'Agendar cirugía'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Thin trigger wrapper for use in Server Components
export function ScheduleSurgeryModalTrigger({ team, businessHours }: { team: TenantVet[]; businessHours?: BusinessHoursConfig }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} className="mr-1" />Nueva cirugía
      </Button>
      <ScheduleSurgeryModal
        isOpen={open}
        onClose={() => setOpen(false)}
        team={team}
        businessHours={businessHours}
      />
    </>
  )
}
