'use client'
import { useEffect, useState } from 'react'
import { useFieldArray, Control, useWatch } from 'react-hook-form'
import type { MedicalRecordFormValues } from '@/lib/validations/medical-record'
import type { MedicationCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FreeTextCombobox } from '@/components/ui/free-text-combobox'
import { Lightbulb } from 'lucide-react'

const ROUTE_OPTIONS = ['Oral', 'IV', 'IM', 'SC', 'Tópica', 'Oftálmica', 'Ótica']

interface PrescriptionsFieldsProps {
  control: Control<MedicalRecordFormValues>
  setValue: (name: string, value: unknown) => void
}

export function PrescriptionsFields({ control, setValue }: PrescriptionsFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'prescriptions' })
  const [catalog, setCatalog] = useState<MedicationCatalog[]>([])
  const prescriptions = useWatch({ control, name: 'prescriptions' })
  const weightKg = useWatch({ control, name: 'weight_kg' })

  useEffect(() => {
    fetch('/api/catalog/medications')
      .then(r => r.json())
      .then(j => setCatalog((j.data ?? []).filter((m: MedicationCatalog) => m.active)))
      .catch(() => {})
  }, [])

  const catalogNames = catalog.map(m => m.name)

  function onMedicationSelect(index: number, name: string | undefined) {
    setValue(`prescriptions.${index}.medication_name`, name ?? '')
    const matched = catalog.find(m => m.name === name)
    if (matched) {
      setValue(`prescriptions.${index}.medication_catalog_id`, matched.id)
      setValue(`prescriptions.${index}.active_ingredient`, matched.active_ingredient ?? '')
      setValue(`prescriptions.${index}.route_of_administration`, matched.default_route ?? '')
      if (matched.dose_per_kg && weightKg && weightKg > 0) {
        const dosis = `${(weightKg * matched.dose_per_kg).toFixed(1)} ${matched.dose_unit ?? ''}`
        setValue(`prescriptions.${index}.dosage`, dosis)
        setValue(`prescriptions.${index}.suggested_dose`, dosis)
      }
    } else {
      setValue(`prescriptions.${index}.medication_catalog_id`, undefined)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>Recetas médicas</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({
            medication_catalog_id: undefined,
            medication_name: '',
            active_ingredient: '',
            dosage: '',
            suggested_dose: undefined,
            route_of_administration: '',
            frequency: '',
            duration: '',
            notes: '',
          })}
        >
          + Agregar medicamento
        </Button>
      </div>
      {fields.map((field, index) => {
        const matchedCatalog = catalog.find(m => m.id === prescriptions?.[index]?.medication_catalog_id)
        const suggestion = matchedCatalog?.dose_per_kg && weightKg && weightKg > 0
          ? buildSuggestionText(weightKg, matchedCatalog)
          : null

        return (
          <div key={field.id} className="border border-border rounded-lg p-3 mb-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Medicamento *</Label>
                <FreeTextCombobox
                  value={prescriptions?.[index]?.medication_name}
                  onChange={v => onMedicationSelect(index, v)}
                  options={catalogNames}
                  placeholder="Selecciona o escribe..."
                />
              </div>
              <div>
                <Label className="text-xs">Principio activo</Label>
                <Input
                  {...control.register(`prescriptions.${index}.active_ingredient`)}
                  placeholder="Se pre-llena del catálogo"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Dosis *</Label>
                <Input
                  {...control.register(`prescriptions.${index}.dosage`)}
                  placeholder="ej. 250mg"
                />
                {suggestion && (
                  <p className="flex items-center gap-1 text-xs text-amber-700 mt-1">
                    <Lightbulb size={11} />
                    {suggestion}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Vía de administración</Label>
                <Input
                  {...control.register(`prescriptions.${index}.route_of_administration`)}
                  list={`routes-${index}`}
                  placeholder="ej. Oral"
                />
                <datalist id={`routes-${index}`}>
                  {ROUTE_OPTIONS.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Frecuencia *</Label>
                <Input
                  {...control.register(`prescriptions.${index}.frequency`)}
                  placeholder="ej. Cada 8 horas"
                />
              </div>
              <div>
                <Label className="text-xs">Duración *</Label>
                <Input
                  {...control.register(`prescriptions.${index}.duration`)}
                  placeholder="ej. 7 días"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Input
                {...control.register(`prescriptions.${index}.notes`)}
                placeholder="Instrucciones adicionales"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500"
              onClick={() => remove(index)}
            >
              Eliminar
            </Button>
          </div>
        )
      })}
    </div>
  )
}

function buildSuggestionText(weight: number, med: MedicationCatalog): string {
  const dosis = weight * (med.dose_per_kg ?? 0)
  const unit = med.dose_unit ?? ''
  let text = `Sugerida: ${dosis.toFixed(1)} ${unit} (${weight}kg × ${med.dose_per_kg}${unit}/kg)`
  if (med.concentration) {
    const vol = calcVolume(dosis, med.concentration, unit)
    if (vol) text += ` = ${vol}`
  }
  return text
}

function calcVolume(dose: number, concentration: string, doseUnit: string): string | null {
  const match = concentration.match(/^([\d.]+)\s*(\w+)\s*\/\s*([\d.]+)?\s*(\w+)$/)
  if (!match) return null
  const [, concAmt, concUnit, volAmt, volUnit] = match
  if (concUnit?.toLowerCase() !== doseUnit.toLowerCase()) return null
  const concPerVol = parseFloat(concAmt) / parseFloat(volAmt || '1')
  const volume = dose / concPerVol
  return `${volume.toFixed(2)} ${volUnit}`
}
