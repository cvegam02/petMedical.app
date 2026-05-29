'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ownerSchema, type OwnerFormValues } from '@/lib/validations/owner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/ui/form-section'

interface OwnerFormProps {
  defaultValues?: Partial<OwnerFormValues>
  ownerId?: string
}

export function OwnerForm({ defaultValues, ownerId }: OwnerFormProps) {
  const router = useRouter()
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerSchema),
    defaultValues: defaultValues ?? {},
  })

  const phoneValue = watch('phone')

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setValue('phone', formatted)
  }

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
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        <FormSection title="Identidad">
          <div className="space-y-1">
            <Label htmlFor="full_name">Nombre completo <span className="text-destructive">*</span></Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && <p className="text-destructive text-xs mt-1">{errors.full_name.message}</p>}
          </div>
        </FormSection>

        <FormSection title="Contacto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="phone">Teléfono <span className="text-destructive">*</span></Label>
              <Input 
                id="phone" 
                {...register('phone')} 
                value={phoneValue || ''}
                onChange={handlePhoneChange}
                placeholder="555 123 4567"
              />
              {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>
          <div className="space-y-1 mt-4">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" {...register('address')} />
          </div>
        </FormSection>

        <div className="px-5 py-4 bg-muted/30 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : ownerId ? 'Guardar cambios' : 'Crear dueño'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </div>
    </form>
  )
}
