'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { addendumSchema, type AddendumFormValues } from '@/lib/validations/medical-record'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar la adenda'); return }
      onAdded(json.data)
      reset()
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la adenda')
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
    <form onSubmit={handleSubmit(onSubmit)} className="border border-border rounded-lg p-4 space-y-3">
      <div>
        <Label htmlFor="content">Adenda</Label>
        <Textarea
          id="content"
          {...register('content')}
          rows={3}
          className="mt-1"
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
