'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { petSchema, type PetFormValues } from '@/lib/validations/pet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateInput } from '@/components/ui/date-input'
import { FormSection } from '@/components/ui/form-section'
import { BreedCombobox } from '@/components/ui/breed-combobox'

interface Species { id: string; name: string }

interface PetFormProps {
  ownerId: string
  petId?: string
  defaultValues?: Partial<PetFormValues>
}

export function PetForm({ ownerId, petId, defaultValues }: PetFormProps) {
  const router = useRouter()
  const [species, setSpecies] = useState<Species[]>([])
  const [breedSuggestions, setBreedSuggestions] = useState<string[]>([])
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<PetFormValues>({
    resolver: zodResolver(petSchema) as any,
    defaultValues: { ...defaultValues, owner_id: ownerId, sex: defaultValues?.sex ?? 'unknown' },
  })

  const selectedSpeciesId = watch('species_id')

  useEffect(() => {
    fetch('/api/species')
      .then(r => r.json())
      .then(j => setSpecies(j.data ?? []))
      .catch(() => setSpecies([]))
  }, [])

  useEffect(() => {
    setBreedSuggestions([])
    if (!selectedSpeciesId) return
    fetch(`/api/species/${selectedSpeciesId}/breeds`)
      .then(r => r.json())
      .then(j => setBreedSuggestions((j.data ?? []).map((b: { name: string }) => b.name)))
      .catch(() => setBreedSuggestions([]))
  }, [selectedSpeciesId])

  const onSubmit = async (values: PetFormValues) => {
    const url = petId ? `/api/pets/${petId}` : '/api/pets'
    const method = petId ? 'PATCH' : 'POST'
    const payload = petId ? (() => { const { owner_id, ...rest } = values; return rest })() : values
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    router.push(`/dashboard/owners/${ownerId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register('owner_id')} />
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        <FormSection title="Paciente">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nombre <span className="text-destructive">*</span></Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Especie <span className="text-destructive">*</span></Label>
              <Select
                value={watch('species_id') || ''}
                onValueChange={(v) => { if (v != null) { setValue('species_id', v as string); setValue('breed', undefined as any) } }}
                items={Object.fromEntries(species.map(s => [s.id, s.name]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar especie" />
                </SelectTrigger>
                <SelectContent>
                  {species.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.species_id && <p className="text-destructive text-xs mt-1">{errors.species_id.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-1">
              <Label>Raza</Label>
              <BreedCombobox
                value={watch('breed')}
                onChange={v => setValue('breed', v)}
                suggestions={breedSuggestions}
                disabled={!selectedSpeciesId}
              />
            </div>
            <div className="space-y-1">
              <Label>Sexo <span className="text-destructive">*</span></Label>
              <Select
                value={watch('sex') || 'unknown'}
                onValueChange={(v) => { if (v != null) setValue('sex', v as 'male' | 'female' | 'unknown') }}
                items={{ unknown: 'Desconocido', male: 'Macho', female: 'Hembra' }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Desconocido</SelectItem>
                  <SelectItem value="male">Macho</SelectItem>
                  <SelectItem value="female">Hembra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        <FormSection title="Datos clínicos">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Fecha de nacimiento</Label>
              <DateInput
                value={watch('date_of_birth')}
                onChange={v => setValue('date_of_birth', v ?? '')}
                disabled={(date) => date > new Date()}
              />
              {errors.date_of_birth && <p className="text-destructive text-xs mt-1">{errors.date_of_birth.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="color">Color</Label>
              <Input id="color" {...register('color')} placeholder="ej. café con blanco" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <Label htmlFor="microchip">Microchip</Label>
            <Input id="microchip" {...register('microchip')} />
          </div>
        </FormSection>

        <FormSection title="Notas">
          <div className="space-y-1">
            <Label htmlFor="notes">Notas internas</Label>
            <Input id="notes" {...register('notes')} placeholder="Alergias, temperamento, observaciones..." />
          </div>
        </FormSection>

        <div className="px-5 py-4 bg-muted/30 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : petId ? 'Guardar cambios' : 'Agregar mascota'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </div>
    </form>
  )
}
