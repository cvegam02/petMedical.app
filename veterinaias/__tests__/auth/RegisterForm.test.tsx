import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { createClient } from '@/lib/supabase/client'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const mockSignUp = vi.fn()
vi.mocked(createClient).mockReturnValue({
  auth: { signUp: mockSignUp },
} as any)

describe('RegisterForm', () => {
  beforeEach(() => mockSignUp.mockClear())

  it('muestra error si la contrasena tiene menos de 8 caracteres', async () => {
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Dr. Lopez')
    await userEvent.type(screen.getByLabelText(/email/i), 'dr@vet.com')
    await userEvent.type(screen.getByLabelText(/contrasena/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(await screen.findByText(/al menos 8 caracteres/i)).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('llama a signUp con datos validos', async () => {
    mockSignUp.mockResolvedValue({ data: { user: {} }, error: null })
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Dr. Lopez')
    await userEvent.type(screen.getByLabelText(/email/i), 'dr@vet.com')
    await userEvent.type(screen.getByLabelText(/contrasena/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'dr@vet.com',
        password: 'password123',
        options: { data: { full_name: 'Dr. Lopez' } },
      })
    })
  })
})
