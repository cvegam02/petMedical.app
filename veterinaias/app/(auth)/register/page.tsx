import { RegisterForm } from '@/components/auth/RegisterForm'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Registra tu veterinaria o clinica en VeterinaIAs</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <p className="text-sm text-center mt-4 text-slate-600">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Inicia sesion
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
