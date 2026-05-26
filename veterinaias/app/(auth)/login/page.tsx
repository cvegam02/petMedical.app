import { LoginForm } from '@/components/auth/LoginForm'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesion</CardTitle>
        <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <p className="text-sm text-center mt-4 text-slate-600">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Registrate
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
