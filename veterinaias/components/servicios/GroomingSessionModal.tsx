'use client'
import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, X, Scissors } from 'lucide-react'
import { groomingSessionSchema, type GroomingSessionFormValues } from '@/lib/validations/grooming'
import type { GroomingServiceCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FreeTextCombobox } from '@/components/ui/free-text-combobox'
import { DateInput } from '@/components/ui/date-input'

const TODAY = new Date().toISOString().split('T')[0]

interface GroomingSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-selected pet. If not provided, shows a pet search field. */
  petId?: string
  petName?: string
  /** Link session to an existing appointment */
  appointmentId?: string
  onSuccess?: () => void
}

export function GroomingSessionModal({
  open,
  onOpenChange,
  petId,
  petName,
  appointmentId,
  onSuccess,
}: GroomingSessionModalProps) {
  const [catalog, setCatalog] = useState<GroomingServiceCatalog[]>([])
  const [petSearch, setPetSearch] = useState('')
  const [petResults, setPetResults] = useState<{ pet_id: string; name: string; species_name: string }[]>([])
  const [resolvedPetId, setResolvedPetId] = useState<string | undefined>(petId)
  const [resolvedPetName, setResolvedPetName] = useState<string | undefined>(petName)
  const [showPetResults, setShowPetResults] = useState(false)

  const {
    handleSubmit, setValue, watch, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<GroomingSessionFormValues>({
    resolver: zodResolver(groomingSessionSchema) as any,
    defaultValues: {
      pet_id: petId ?? '',
      session_date: TODAY,
      services: [{ service_name: '', service_catalog_id: undefined }],
      notes: '',
      appointment_id: appointmentId,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'services' })

  // Load catalog on open
  useEffect(() => {
    if (!open) return
    fetch('/api/catalog/grooming-services')
      .then(r => r.json())
      .then(json => setCatalog((json.data ?? []).filter((s: GroomingServiceCatalog) => s.active)))
  }, [open])

  // Reset when opened with a new petId
  useEffect(() => {
    if (open) {
      setResolvedPetId(petId)
      setResolvedPetName(petName)
      reset({
        pet_id: petId ?? '',
        session_date: TODAY,
        services: [{ service_name: '', service_catalog_id: undefined }],
        notes: '',
        appointment_id: appointmentId,
      })
    }
  }, [open, petId, petName, appointmentId, reset])

  // Pet search (only when petId is not pre-provided)
  useEffect(() => {
    if (petId || petSearch.length < 1) return
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/pets?q=${encodeURIComponent(petSearch)}&limit=5`)
      const json = await res.json()
      // API returns { id, name, species: { name } } — normalize to expected shape
      setPetResults(
        (json.data ?? []).map((p: any) => ({
          pet_id: p.id,
          name: p.name,
          species_name: p.species?.name ?? '',
        }))
      )
      setShowPetResults(true)
    }, 200)
    return () => clearTimeout(timeout)
  }, [petSearch, petId])

  function selectPet(pet: { pet_id: string; name: string }) {
    setResolvedPetId(pet.pet_id)
    setResolvedPetName(pet.name)
    setValue('pet_id', pet.pet_id)
    setPetSearch(pet.name)
    setShowPetResults(false)
  }

  const catalogNames = catalog.map(s => s.name)

  function onServiceNameChange(index: number, name: string | undefined) {
    const matched = catalog.find(s => s.name === name)
    setValue(`services.${index}.service_name`, name ?? '')
    setValue(
      `services.${index}.service_catalog_id`,
      matched ? matched.id : undefined
    )
  }

  async function onSubmit(values: GroomingSessionFormValues) {
    const petIdToUse = resolvedPetId ?? values.pet_id
    if (!petIdToUse) { toast.error('Selecciona una mascota'); return }

    const res = await fetch('/api/servicios/estetica', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, pet_id: petIdToUse }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success('Sesión registrada')
    onOpenChange(false)
    onSuccess?.()
  }

  const sessionDate = watch('session_date')
  const servicesWatch = watch('services')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors size={16} />Registrar sesión de estética
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* Pet selection */}
          {petId ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
              <p className="text-xs text-muted-foreground mb-0.5">Mascota</p>
              <p className="font-semibold text-foreground">{resolvedPetName ?? petId}</p>
            </div>
          ) : (
            <div className="space-y-1 relative">
              <Label>Mascota <span className="text-destructive">*</span></Label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Busca por nombre de mascota..."
                value={resolvedPetName ?? petSearch}
                onChange={e => {
                  setPetSearch(e.target.value)
                  setResolvedPetId(undefined)
                  setResolvedPetName(undefined)
                  setValue('pet_id', '')
                }}
              />
              {showPetResults && petResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg">
                  {petResults.map(p => (
                    <button
                      key={p.pet_id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                      onClick={() => selectPet({ pet_id: p.pet_id, name: p.name })}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground ml-1.5">{p.species_name}</span>
                    </button>
                  ))}
                </div>
              )}
              {errors.pet_id && (
                <p className="text-destructive text-xs">{errors.pet_id.message}</p>
              )}
            </div>
          )}

          {/* Date */}
          <div className="space-y-1">
            <Label>Fecha <span className="text-destructive">*</span></Label>
            <DateInput
              value={sessionDate}
              onChange={v => setValue('session_date', v ?? TODAY)}
            />
          </div>

          {/* Services */}
          <div className="space-y-2">
            <Label>Servicios realizados <span className="text-destructive">*</span></Label>
            {fields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <FreeTextCombobox
                    value={servicesWatch[idx]?.service_name ?? ''}
                    onChange={v => onServiceNameChange(idx, v)}
                    options={catalogNames}
                    placeholder="Selecciona o escribe un servicio..."
                  />
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button" size="sm" variant="ghost"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => remove(idx)}
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            ))}
            {errors.services && (
              <p className="text-destructive text-xs">
                {typeof errors.services === 'object' && 'message' in errors.services
                  ? (errors.services as { message?: string }).message
                  : 'Agrega al menos un servicio'}
              </p>
            )}
            <Button
              type="button" size="sm" variant="outline"
              onClick={() => append({ service_name: '', service_catalog_id: undefined })}
            >
              <Plus size={13} className="mr-1" />Agregar otro
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea
              placeholder="Observaciones, estado del pelaje, incidencias..."
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValue('notes', e.target.value)}
              value={watch('notes') ?? ''}
              className="resize-none h-20"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Registrar sesión'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
