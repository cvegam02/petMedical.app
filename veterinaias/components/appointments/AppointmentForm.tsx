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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormSection } from '@/components/ui/form-section'

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

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<AppointmentFormValues>({
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
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register('owner_id')} />
      <input type="hidden" {...register('pet_id')} />

      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        <FormSection title="Paciente">
          <div className="relative space-y-1">
            <Label htmlFor="owner_search">Dueño <span className="text-destructive">*</span></Label>
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
                      {o.phone != null && <span className="text-muted-foreground ml-2">{o.phone}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1 mt-4">
            <Label>Mascota <span className="text-destructive">*</span></Label>
            <Select
              value={watch('pet_id') || ''}
              onValueChange={(v) => setValue('pet_id', v ?? '')}
              disabled={!selectedOwner || pets.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedOwner ? 'Selecciona un dueño primero'
                  : pets.length === 0 ? 'Este dueño no tiene mascotas'
                  : 'Selecciona una mascota'
                } />
              </SelectTrigger>
              <SelectContent>
                {pets.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.species ? ` (${p.species.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pet_id && <p className="text-destructive text-xs mt-1">{errors.pet_id.message}</p>}
          </div>
        </FormSection>

        <FormSection title="Horario">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="scheduled_at">Fecha y hora <span className="text-destructive">*</span></Label>
              <Input id="scheduled_at" type="datetime-local" {...register('scheduled_at')} />
              {errors.scheduled_at && <p className="text-destructive text-xs mt-1">{errors.scheduled_at.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Duración</Label>
              <Select
                value={String(watch('duration_minutes') || 30)}
                onValueChange={(v) => setValue('duration_minutes', Number(v ?? 30) as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
        </FormSection>

        <FormSection title="Detalles">
          <div className="space-y-1">
            <Label htmlFor="reason">Motivo de la cita</Label>
            <Input id="reason" {...register('reason')} placeholder="Ej. Consulta general, vacunación, cirugía..." />
          </div>
          {team.length > 0 && (
            <div className="space-y-1 mt-4">
              <Label>Asignar a</Label>
              <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {team.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1 mt-4">
            <Label htmlFor="notes">Notas internas</Label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={3}
              className="h-auto w-full min-w-0 rounded-sm border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none resize-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              placeholder="Observaciones para el equipo..."
            />
          </div>
        </FormSection>

        <div className="px-5 py-4 bg-muted/30 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Crear cita'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  )
}
