'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { addendumSchema, type AddendumFormValues } from '@/lib/validations/medical-record'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface AddendumFormProps {
  recordId: string
  onAdded: (addendum: { id: string; content: string; created_at: string; created_by_profile: { full_name: string } | null }) => void
}

export function AddendumForm({ recordId, onAdded }: AddendumFormProps) {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddendumFormValues>({
    resolver: zodResolver(addendumSchema),
  })

  const onSubmit = async (values: AddendumFormValues) => {
    try {
      const res = await fetch(`/api/medical-records/${recordId}/addendums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error); return }
      onAdded(json.data)
      reset()
      setOpen(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar la adenda')
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Agregar adenda
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="border border-slate-200 rounded-lg p-4 space-y-3">
      <div>
        <Label htmlFor="content">Adenda</Label>
        <textarea
          id="content"
          {...register('content')}
          rows={3}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none mt-1"
          placeholder="Corrección o nota adicional sobre este expediente..."
        />
        {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar adenda'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  )
}
