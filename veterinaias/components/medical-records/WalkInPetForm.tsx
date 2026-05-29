'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FormSection } from '@/components/ui/form-section'
import { BreedCombobox } from '@/components/ui/breed-combobox'
import { PetSearchCombobox, type PetSearchResult } from './PetSearchCombobox'
import type { WalkInPetValues } from '@/lib/validations/medical-record'

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }

interface Species { id: string; name: string }

interface WalkInPetFormProps {
  values: WalkInPetValues
  onChange: (values: WalkInPetValues) => void
  errors?: Partial<Record<keyof WalkInPetValues, string>>
  onPetSelected: (pet: PetSearchResult) => void
}

export function WalkInPetForm({ values, onChange, errors, onPetSelected }: WalkInPetFormProps) {
  const [species, setSpecies] = useState<Species[]>([])
  const [breedSuggestions, setBreedSuggestions] = useState<string[]>([])
  const [dobOpen, setDobOpen] = useState(false)

  useEffect(() => {
    fetch('/api/species')
      .then(r => r.json())
      .then(json => setSpecies(json.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setBreedSuggestions([])
    if (!values.species_id) return
    fetch(`/api/species/${values.species_id}/breeds`)
      .then(r => r.json())
      .then(json => setBreedSuggestions((json.data ?? []).map((b: { name: string }) => b.name)))
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
            <PetSearchCombobox
              value={values.name}
              onChange={name => update({ name })}
              onSelect={onPetSelected}
              error={errors?.name}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label>
              Especie <span className="text-destructive">*</span>
            </Label>
            <Select
              value={values.species_id || ''}
              onValueChange={v => update({ species_id: v ?? '', breed: undefined })}
              items={Object.fromEntries(species.map(s => [s.id, s.name]))}
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

          <div className="space-y-1">
            <Label>Raza</Label>
            <BreedCombobox
              value={values.breed}
              onChange={breed => update({ breed })}
              suggestions={breedSuggestions}
              disabled={!values.species_id}
            />
          </div>

          <div className="space-y-1">
            <Label>Sexo</Label>
            <Select
              value={values.sex}
              onValueChange={v => update({ sex: v as WalkInPetValues['sex'] })}
              items={{ unknown: 'Desconocido', male: 'Macho', female: 'Hembra' }}
            >
              <SelectTrigger>
                <SelectValue>{SEX_LABELS[values.sex] ?? values.sex}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Macho</SelectItem>
                <SelectItem value="female">Hembra</SelectItem>
                <SelectItem value="unknown">Desconocido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Fecha de nacimiento</Label>
            <Popover open={dobOpen} onOpenChange={setDobOpen}>
              <PopoverTrigger
                className="flex h-9 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground shadow-xs hover:bg-muted"
              >
                <CalendarIcon size={14} className="shrink-0 text-muted-foreground" />
                {values.date_of_birth
                  ? format(new Date(values.date_of_birth + 'T12:00:00'), 'd MMM yyyy', { locale: es })
                  : <span className="text-muted-foreground">Selecciona una fecha</span>
                }
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={values.date_of_birth ? new Date(values.date_of_birth + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    update({ date_of_birth: date ? format(date, 'yyyy-MM-dd') : undefined })
                    setDobOpen(false)
                  }}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </FormSection>
    </div>
  )
}
