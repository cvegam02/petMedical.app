import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppointmentQuickModal } from '@/components/dashboard/AppointmentQuickModal'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const makeApt = (overrides: Partial<DashboardAppointment> = {}): DashboardAppointment => ({
  id: 'apt-1',
  status: 'confirmed',
  scheduled_at: '2026-05-27T10:30:00.000Z',
  duration_minutes: 30,
  reason: 'Vacunación',
  pet: { id: 'pet-1', name: 'Luna', species: { name: 'Perro' } },
  owner: { id: 'owner-1', full_name: 'Carlos Mendoza', phone: '5551234567' },
  assigned_to_profile: null,
  ...overrides,
})

describe('AppointmentQuickModal', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }))
  })

  it('renderiza la lista de tarjetas', () => {
    const apts = [makeApt({ id: 'apt-1', pet: { id: 'p1', name: 'Luna', species: { name: 'Perro' } } }), makeApt({ id: 'apt-2', pet: { id: 'p2', name: 'Max', species: { name: 'Gato' } } })]
    render(<AppointmentQuickModal appointments={apts} />)
    expect(screen.getByText('Luna')).toBeInTheDocument()
    expect(screen.getByText('Max')).toBeInTheDocument()
  })

  it('no muestra el modal si no se ha hecho click en ninguna tarjeta', () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abre el modal al hacer click en una tarjeta', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('el modal muestra el nombre de la mascota y el dueño', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Luna')
    expect(dialog).toHaveTextContent('Carlos Mendoza')
  })

  it('el modal muestra el motivo de consulta', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Vacunación')
  })

  it('el botón "Iniciar consulta" tiene el href correcto para cita confirmed', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    const link = screen.getByRole('link', { name: /iniciar consulta/i })
    expect(link).toHaveAttribute('href', '/dashboard/pets/pet-1/records/new?appointmentId=apt-1')
  })

  it('el botón "Iniciar consulta" aparece para cita scheduled', async () => {
    render(<AppointmentQuickModal appointments={[makeApt({ status: 'scheduled' })]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    expect(screen.getByRole('link', { name: /iniciar consulta/i })).toBeInTheDocument()
  })

  it('NO muestra acciones para cita en estado terminal (completed)', async () => {
    render(<AppointmentQuickModal appointments={[makeApt({ status: 'completed' })]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    expect(screen.queryByRole('link', { name: /iniciar consulta/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /no se presentó/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument()
  })

  it('"No se presentó" hace PATCH y cierra el modal', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    await userEvent.click(screen.getByRole('button', { name: /no se presentó/i }))
    expect(fetch).toHaveBeenCalledWith('/api/appointments/apt-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'no_show' }),
    }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('"Cancelar cita" hace PATCH y cierra el modal', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancelar cita/i }))
    expect(fetch).toHaveBeenCalledWith('/api/appointments/apt-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('el botón X cierra el modal', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    await userEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
