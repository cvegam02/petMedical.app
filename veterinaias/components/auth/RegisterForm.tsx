'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterInput) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    })
    if (error) {
      setServerError('No se pudo crear la cuenta. ' + error.message)
      return
    }
    router.push('/onboarding')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input id="full_name" aria-label="Nombre completo" {...register('full_name')} />
        {errors.full_name && (
          <p className="text-sm text-destructive">{errors.full_name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" aria-label="Email" {...register('email')} />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Contrasena</Label>
        <Input
          id="password"
          type="password"
          aria-label="Contrasena"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
      </Button>
    </form>
  )
}
