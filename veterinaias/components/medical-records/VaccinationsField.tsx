'use client'
import { useEffect, useState } from 'react'
import { useFieldArray, Control, useWatch } from 'react-hook-form'
import type { MedicalRecordFormValues } from '@/lib/validations/medical-record'
import type { VaccineCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FreeTextCombobox } from '@/components/ui/free-text-combobox'
import { Plus, Trash2 } from 'lucide-react'

const TODAY = new Date().toISOString().split('T')[0]

interface VaccinationsFieldProps {
  control: Control<MedicalRecordFormValues>
  setValue: (name: string, value: unknown) => void
}

export function VaccinationsField({ control, setValue }: VaccinationsFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'vaccinations' })
  const [catalogVaccines, setCatalogVaccines] = useState<VaccineCatalog[]>([])
  const vaccinations = useWatch({ control, name: 'vaccinations' })

  useEffect(() => {
    fetch('/api/catalog/vaccines')
      .then(r => r.json())
      .then(j => setCatalogVaccines((j.data ?? []).filter((v: VaccineCatalog) => v.active)))
      .catch(() => {})
  }, [])

  const catalogNames = catalogVaccines.map(v => v.name)

  function onVaccineSelect(index: number, name: string | undefined) {
    setValue(`vaccinations.${index}.vaccine_name`, name ?? '')
    const matched = catalogVaccines.find(v => v.name === name)
    if (matched) {
      setValue(`vaccinations.${index}.vaccine_catalog_id`, matched.id)
      setValue(`vaccinations.${index}.lot_number`, matched.lot_number ?? '')
    } else {
      setValue(`vaccinations.${index}.vaccine_catalog_id`, undefined)
    }
  }

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="border border-border/60 rounded-lg p-3 space-y-2 bg-muted/10">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Vacuna *</Label>
              <FreeTextCombobox
                value={vaccinations?.[index]?.vaccine_name}
                onChange={v => onVaccineSelect(index, v)}
                options={catalogNames}
                placeholder="Selecciona o escribe..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lote</Label>
              <Input {...control.register(`vaccinations.${index}.lot_number`)} placeholder="Pre-llenado del catálogo" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Fecha aplicación</Label>
              <Input type="date" {...control.register(`vaccinations.${index}.application_date`)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Próxima fecha</Label>
              <Input type="date" {...control.register(`vaccinations.${index}.next_due_date`)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-2">
              <Input {...control.register(`vaccinations.${index}.notes`)} placeholder="Notas opcionales" />
            </div>
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => remove(index)}>
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ vaccine_name: '', lot_number: '', application_date: TODAY, next_due_date: '', notes: '', vaccine_catalog_id: '' })}
      >
        <Plus size={13} className="mr-1" />Agregar vacuna
      </Button>
    </div>
  )
}
