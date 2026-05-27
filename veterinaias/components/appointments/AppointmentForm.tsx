'use client'
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { appointmentFormSchema, type AppointmentFormValues } from '@/lib/validations/appointment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TeamMember { id: string; full_name: string }

interface AppointmentFormProps {
  team: TeamMember[]
}

export function AppointmentForm({ team }: AppointmentFormProps) {
  const router = useRouter()
  const [ownerQuery, setOwnerQuery] = useState('')
  const [ownerResults, setOwnerResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; full_name: string } | null>(null)
  const [pets, setPets] = useState<{ id: string; name: string; species: { name: string } | null }[]>([])
  const [assignedTo, setAssignedTo] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema) as any,
    defaultValues: { duration_minutes: 30 },
  })

  useEffect(() => {
    if (ownerQuery.length < 2) { setOwnerResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/owners?q=${encodeURIComponent(ownerQuery)}`)
      const json = await res.json()
      setOwnerResults(json.data ?? [])
      setShowSuggestions(true)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [ownerQuery])

  useEffect(() => {
    if (!selectedOwner) { setPets([]); return }
    fetch(`/api/pets?ownerId=${selectedOwner.id}`)
      .then(r => r.json())
      .then(json => setPets(json.data ?? []))
      .catch(() => setPets([]))
  }, [selectedOwner])

  function selectOwner(owner: { id: string; full_name: string; phone: string | null }) {
    setSelectedOwner(owner)
    setOwnerQuery(owner.full_name)
    setShowSuggestions(false)
    setValue('owner_id', owner.id)
    setValue('pet_id', '')
  }

  const onSubmit = async (values: AppointmentFormValues) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          scheduled_at: new Date(values.scheduled_at).toISOString(),
          duration_minutes: Number(values.duration_minutes),
          ...(assignedTo ? { assigned_to: assignedTo } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      router.push(`/dashboard/appointments/${json.data.id}`)
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register('owner_id')} />
      <input type="hidden" {...register('pet_id')} />

      {/* Dueño */}
      <div className="relative">
        <Label htmlFor="owner_search">Dueño *</Label>
        <Input
          id="owner_search"
          value={ownerQuery}
          onChange={e => { setOwnerQuery(e.target.value); setSelectedOwner(null) }}
          onFocus={() => ownerResults.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Buscar por nombre, teléfono o email..."
          autoComplete="off"
        />
        {errors.owner_id && <p className="text-destructive text-xs mt-1">{errors.owner_id.message}</p>}
        {showSuggestions && ownerResults.length > 0 && (
          <ul className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
            {ownerResults.map(o => (
              <li key={o.id}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  onMouseDown={() => selectOwner(o)}
                >
                  <span className="font-medium">{o.full_name}</span>
                  {o.phone && <span className="text-muted-foreground ml-2">{o.phone}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mascota */}
      <div>
        <Label htmlFor="pet_id">Mascota *</Label>
        <select
          id="pet_id"
          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
          disabled={!selectedOwner || pets.length === 0}
          onChange={e => setValue('pet_id', e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>
            {!selectedOwner ? 'Selecciona un dueño primero' : pets.length === 0 ? 'Este dueño no tiene mascotas' : 'Selecciona una mascota'}
          </option>
          {pets.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.species ? ` (${p.species.name})` : ''}
            </option>
          ))}
        </select>
        {errors.pet_id && <p className="text-destructive text-xs mt-1">{errors.pet_id.message}</p>}
      </div>

      {/* Fecha y hora */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="scheduled_at">Fecha y hora *</Label>
          <Input
            id="scheduled_at"
            type="datetime-local"
            {...register('scheduled_at')}
          />
          {errors.scheduled_at && <p className="text-destructive text-xs mt-1">{errors.scheduled_at.message}</p>}
        </div>
        <div>
          <Label htmlFor="duration_minutes">Duración</Label>
          <select
            id="duration_minutes"
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
            {...register('duration_minutes')}
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1 hora</option>
            <option value={90}>1.5 horas</option>
          </select>
        </div>
      </div>

      {/* Motivo */}
      <div>
        <Label htmlFor="reason">Motivo de la cita</Label>
        <Input id="reason" {...register('reason')} placeholder="Ej. Consulta general, vacunación, cirugía..." />
      </div>

      {/* Asignar a */}
      {team.length > 0 && (
        <div>
          <Label htmlFor="assigned_to">Asignar a</Label>
          <select
            id="assigned_to"
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
          >
            <option value="">Sin asignar</option>
            {team.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Notas */}
      <div>
        <Label htmlFor="notes">Notas internas</Label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={2}
          className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none bg-background"
          placeholder="Observaciones para el equipo..."
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Crear cita'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
