import { RegisterForm } from '@/components/auth/RegisterForm'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground mt-1">Registra tu veterinaria o clinica</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <RegisterForm />
        <p className="text-sm text-center mt-5 text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Inicia sesion
          </Link>
        </p>
      </div>
    </div>
  )
}
