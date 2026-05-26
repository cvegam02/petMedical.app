'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TenantType } from '@/lib/types/database'

const inviteSchema = z.object({
  email: z.string().email('Email invalido'),
  role: z.enum(['staff', 'doctor', 'assistant']),
})
type InviteInput = z.infer<typeof inviteSchema>

export function InviteUserForm({ tenantType, onSuccess }: { tenantType: TenantType; onSuccess?: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'staff' },
  })

  async function onSubmit(data: InviteInput) {
    setServerError(null)
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error); return }
    setSuccess(true)
    reset()
    onSuccess?.()
  }

  const roleOptions = tenantType === 'enterprise'
    ? [{ value: 'doctor', label: 'Doctor' }, { value: 'assistant', label: 'Asistente' }, { value: 'staff', label: 'Staff' }]
    : [{ value: 'staff', label: 'Staff' }]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {success && <p className="text-sm text-green-600">Invitacion enviada exitosamente</p>}
      <div className="space-y-1">
        <Label htmlFor="invite-email">Email del nuevo usuario</Label>
        <Input id="invite-email" type="email" placeholder="doctor@clinica.com" {...register('email')} />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Rol</Label>
        <Select defaultValue="staff" onValueChange={(v) => setValue('role', v as InviteInput['role'])}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar rol" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Invitando...' : 'Enviar invitacion'}
      </Button>
    </form>
  )
}
