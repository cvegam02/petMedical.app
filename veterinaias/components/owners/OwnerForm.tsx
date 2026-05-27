'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ownerSchema, type OwnerFormValues } from '@/lib/validations/owner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface OwnerFormProps {
  defaultValues?: Partial<OwnerFormValues>
  ownerId?: string
}

export function OwnerForm({ defaultValues, ownerId }: OwnerFormProps) {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerSchema),
    defaultValues: defaultValues ?? {},
  })

  const onSubmit = async (values: OwnerFormValues) => {
    const url = ownerId ? `/api/owners/${ownerId}` : '/api/owners'
    const method = ownerId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    router.push(`/dashboard/owners/${ownerId ?? json.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="full_name">Nombre completo *</Label>
        <Input id="full_name" {...register('full_name')} />
        {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>}
      </div>
      <div>
        <Label htmlFor="phone">Teléfono *</Label>
        <Input id="phone" {...register('phone')} />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" {...register('address')} />
        {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : ownerId ? 'Guardar cambios' : 'Crear dueño'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
