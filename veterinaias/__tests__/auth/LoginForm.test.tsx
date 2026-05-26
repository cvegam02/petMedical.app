import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'
import { createClient } from '@/lib/supabase/client'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const mockSignIn = vi.fn()
vi.mocked(createClient).mockReturnValue({
  auth: { signInWithPassword: mockSignIn },
} as any)

describe('LoginForm', () => {
  beforeEach(() => mockSignIn.mockClear())

  it('muestra errores de validacion cuando los campos estan vacios', async () => {
    render(<LoginForm />)
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    expect(await screen.findByText(/email es requerido/i)).toBeInTheDocument()
    expect(await screen.findByText(/contrasena es requerida/i)).toBeInTheDocument()
  })

  it('llama a signInWithPassword con email y password correctos', async () => {
    mockSignIn.mockResolvedValue({ data: { user: {} }, error: null })
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'vet@clinica.com')
    await userEvent.type(screen.getByLabelText(/contrasena/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'vet@clinica.com',
        password: 'password123',
      })
    })
  })

  it('muestra mensaje de error cuando las credenciales son invalidas', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } })
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'vet@clinica.com')
    await userEvent.type(screen.getByLabelText(/contrasena/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    expect(await screen.findByText(/credenciales invalidas/i)).toBeInTheDocument()
  })
})
