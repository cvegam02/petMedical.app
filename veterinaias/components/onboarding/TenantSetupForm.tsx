'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { tenantSchema, type TenantInput } from '@/lib/validations/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export function TenantSetupForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TenantInput>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { type: 'individual' },
  })

  const selectedType = watch('type')

  async function onSubmit(data: TenantInput) {
    setServerError(null)
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      setServerError(json.error)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1">
        <Label htmlFor="name">Nombre de tu clinica o veterinaria</Label>
        <Input
          id="name"
          placeholder="Ej: Clinica Veterinaria Lopez"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Tipo de negocio</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: 'individual',
              label: 'Veterinaria Individual',
              desc: 'Hasta 5 personas, calendario compartido',
            },
            {
              value: 'enterprise',
              label: 'Hospital / Clinica',
              desc: 'Multiples doctores, calendarios independientes',
            },
          ].map(({ value, label, desc }) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                value={value}
                {...register('type')}
                className="sr-only"
              />
              <Card
                className={`border-2 transition-colors ${
                  selectedType === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <CardContent className="p-4">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </CardContent>
              </Card>
            </label>
          ))}
        </div>
        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Configurando...' : 'Crear mi clinica'}
      </Button>
    </form>
  )
}
