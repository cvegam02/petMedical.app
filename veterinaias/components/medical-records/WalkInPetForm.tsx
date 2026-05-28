'use client'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormSection } from '@/components/ui/form-section'
import type { WalkInPetValues } from '@/lib/validations/medical-record'

interface Species { id: string; name: string }
interface Breed { id: string; name: string }

interface WalkInPetFormProps {
  values: WalkInPetValues
  onChange: (values: WalkInPetValues) => void
  errors?: Partial<Record<keyof WalkInPetValues, string>>
}

export function WalkInPetForm({ values, onChange, errors }: WalkInPetFormProps) {
  const [species, setSpecies] = useState<Species[]>([])
  const [breeds, setBreeds] = useState<Breed[]>([])

  useEffect(() => {
    fetch('/api/species')
      .then(r => r.json())
      .then(json => setSpecies(json.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setBreeds([])
    if (!values.species_id) return
    fetch(`/api/species/${values.species_id}/breeds`)
      .then(r => r.json())
      .then(json => setBreeds(json.data ?? []))
      .catch(() => {})
  }, [values.species_id])

  function update(patch: Partial<WalkInPetValues>) {
    onChange({ ...values, ...patch })
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border mb-5">
      <FormSection title="Paciente nuevo">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="pet_name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pet_name"
              value={values.name}
              onChange={e => update({ name: e.target.value })}
              placeholder="Ej. Luna, Rocky..."
              autoFocus
            />
            {errors?.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <Label>
              Especie <span className="text-destructive">*</span>
            </Label>
            <Select
              value={values.species_id || ''}
              onValueChange={v => update({ species_id: v ?? '', breed_id: undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar especie" />
              </SelectTrigger>
              <SelectContent>
                {species.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors?.species_id && <p className="text-destructive text-xs mt-1">{errors.species_id}</p>}
          </div>

          {breeds.length > 0 && (
            <div className="space-y-1">
              <Label>Raza</Label>
              <Select
                value={(values.breed_id ?? '') as string}
                onValueChange={v => update({ breed_id: v || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar raza (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {breeds.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Sexo</Label>
            <Select
              value={values.sex}
              onValueChange={v => update({ sex: v as WalkInPetValues['sex'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Macho</SelectItem>
                <SelectItem value="female">Hembra</SelectItem>
                <SelectItem value="unknown">Desconocido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pet_dob">Fecha de nacimiento</Label>
            <Input
              id="pet_dob"
              type="date"
              value={values.date_of_birth ?? ''}
              onChange={e => update({ date_of_birth: e.target.value || undefined })}
            />
          </div>
        </div>
      </FormSection>
    </div>
  )
}
