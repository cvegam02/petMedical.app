'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
      setServerError('Credenciales invalidas. Verifica tu email y contrasena.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        {isSubmitting ? 'Iniciando sesion...' : 'Iniciar sesion'}
      </Button>
    </form>
  )
}
