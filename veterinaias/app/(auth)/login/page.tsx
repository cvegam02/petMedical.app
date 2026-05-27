import { LoginForm } from '@/components/auth/LoginForm'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-5 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">VeterinaIAs</p>
          <span className="w-5 h-[1.5px] bg-primary/30 rounded-full" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Iniciar sesion</h1>
        <p className="text-sm text-muted-foreground mt-1">Ingresa tus credenciales para continuar</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <LoginForm />
        <p className="text-sm text-center mt-5 text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
