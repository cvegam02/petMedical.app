'use client'
import { useFieldArray, Control, useWatch, type UseFormSetValue } from 'react-hook-form'
import type { MedicalRecordFormValues } from '@/lib/validations/medical-record'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateInput } from '@/components/ui/date-input'
import { Plus, Trash2 } from 'lucide-react'

const TODAY = new Date().toISOString().split('T')[0]

interface DewormingsFieldProps {
  control: Control<MedicalRecordFormValues>
  setValue: UseFormSetValue<MedicalRecordFormValues>
}

export function DewormingsField({ control, setValue }: DewormingsFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'dewormings' })
  const dewormings = useWatch({ control, name: 'dewormings' })

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="border border-border/60 rounded-lg p-3 space-y-2 bg-muted/10">
          <div className="space-y-1">
            <Label className="text-xs">Producto *</Label>
            <Input {...control.register(`dewormings.${index}.product_name`)} placeholder="ej. Bravecto, NexGard..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Fecha aplicación</Label>
              <DateInput
                value={dewormings?.[index]?.application_date}
                onChange={v => setValue(`dewormings.${index}.application_date`, v ?? '')}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Próxima fecha</Label>
              <DateInput
                value={dewormings?.[index]?.next_due_date}
                onChange={v => setValue(`dewormings.${index}.next_due_date`, v ?? '')}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-2">
              <Input {...control.register(`dewormings.${index}.notes`)} placeholder="Notas opcionales" />
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
        onClick={() => append({ product_name: '', application_date: TODAY, next_due_date: '', notes: '' })}
      >
        <Plus size={13} className="mr-1" />Agregar desparasitación
      </Button>
    </div>
  )
}
