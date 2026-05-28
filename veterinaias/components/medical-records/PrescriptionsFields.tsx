'use client'
import { useFieldArray, Control } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PrescriptionsFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
}

export function PrescriptionsFields({ control }: PrescriptionsFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'prescriptions' })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>Recetas médicas</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ medication_name: '', dosage: '', frequency: '', duration: '', notes: '' })}
        >
          + Agregar medicamento
        </Button>
      </div>
      {fields.map((field, index) => (
        <div key={field.id} className="border border-slate-200 rounded p-3 mb-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Medicamento *</Label>
              <Input {...control.register(`prescriptions.${index}.medication_name`)} placeholder="ej. Amoxicilina" />
            </div>
            <div>
              <Label className="text-xs">Dosis *</Label>
              <Input {...control.register(`prescriptions.${index}.dosage`)} placeholder="ej. 250mg" />
            </div>
            <div>
              <Label className="text-xs">Frecuencia *</Label>
              <Input {...control.register(`prescriptions.${index}.frequency`)} placeholder="ej. Cada 8 horas" />
            </div>
            <div>
              <Label className="text-xs">Duración *</Label>
              <Input {...control.register(`prescriptions.${index}.duration`)} placeholder="ej. 7 días" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notas</Label>
            <Input {...control.register(`prescriptions.${index}.notes`)} placeholder="Instrucciones adicionales" />
          </div>
          <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => remove(index)}>
            Eliminar
          </Button>
        </div>
      ))}
    </div>
  )
}
