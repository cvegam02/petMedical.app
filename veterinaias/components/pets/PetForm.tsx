'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { petSchema, type PetFormValues } from '@/lib/validations/pet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Species { id: string; name: string }
interface Breed { id: string; name: string }

interface PetFormProps {
  ownerId: string
  petId?: string
  defaultValues?: Partial<PetFormValues>
}

export function PetForm({ ownerId, petId, defaultValues }: PetFormProps) {
  const router = useRouter()
  const [species, setSpecies] = useState<Species[]>([])
  const [breeds, setBreeds] = useState<Breed[]>([])

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<PetFormValues>({
    resolver: zodResolver(petSchema),
    defaultValues: { ...defaultValues, owner_id: ownerId, sex: defaultValues?.sex ?? 'unknown' },
  })

  const selectedSpeciesId = watch('species_id')

  useEffect(() => {
    fetch('/api/species').then(r => r.json()).then(j => setSpecies(j.data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedSpeciesId) return
    fetch(`/api/species/${selectedSpeciesId}/breeds`).then(r => r.json()).then(j => setBreeds(j.data ?? []))
  }, [selectedSpeciesId])

  const onSubmit = async (values: PetFormValues) => {
    const url = petId ? `/api/pets/${petId}` : '/api/pets'
    const method = petId ? 'PATCH' : 'POST'
    const payload = petId ? (() => { const { owner_id, ...rest } = values; return rest })() : values
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    router.push(`/dashboard/owners/${ownerId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <input type="hidden" {...register('owner_id')} />
      <div>
        <Label htmlFor="name">Nombre de la mascota *</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="species_id">Especie *</Label>
        <select id="species_id" {...register('species_id')} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
          <option value="">Seleccionar especie</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {errors.species_id && <p className="text-red-500 text-sm mt-1">{errors.species_id.message}</p>}
      </div>
      {breeds.length > 0 && (
        <div>
          <Label htmlFor="breed_id">Raza</Label>
          <select id="breed_id" {...register('breed_id')} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
            <option value="">Sin especificar</option>
            {breeds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <Label htmlFor="sex">Sexo *</Label>
        <select id="sex" {...register('sex')} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
          <option value="unknown">Desconocido</option>
          <option value="male">Macho</option>
          <option value="female">Hembra</option>
        </select>
      </div>
      <div>
        <Label htmlFor="date_of_birth">Fecha de nacimiento</Label>
        <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
      </div>
      <div>
        <Label htmlFor="color">Color</Label>
        <Input id="color" {...register('color')} placeholder="ej. café con blanco" />
      </div>
      <div>
        <Label htmlFor="microchip">Microchip</Label>
        <Input id="microchip" {...register('microchip')} />
      </div>
      <div>
        <Label htmlFor="notes">Notas</Label>
        <Input id="notes" {...register('notes')} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : petId ? 'Guardar cambios' : 'Agregar mascota'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
