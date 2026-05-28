import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DashboardAppointmentCard } from '@/components/dashboard/DashboardAppointmentCard'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

const apt: DashboardAppointment = {
  id: 'apt-1',
  status: 'confirmed',
  scheduled_at: '2026-05-27T10:30:00.000Z',
  duration_minutes: 30,
  reason: 'Vacunación',
  pet: { id: 'pet-1', name: 'Luna', species: { name: 'Perro' } },
  owner: { id: 'owner-1', full_name: 'Carlos Mendoza', phone: '5551234567' },
  assigned_to_profile: null,
}

describe('DashboardAppointmentCard', () => {
  it('muestra el nombre de la mascota', () => {
    render(<DashboardAppointmentCard appointment={apt} onSelect={vi.fn()} />)
    expect(screen.getByText('Luna')).toBeInTheDocument()
  })

  it('muestra la especie', () => {
    render(<DashboardAppointmentCard appointment={apt} onSelect={vi.fn()} />)
    expect(screen.getByText('Perro')).toBeInTheDocument()
  })

  it('muestra el nombre del dueño', () => {
    render(<DashboardAppointmentCard appointment={apt} onSelect={vi.fn()} />)
    expect(screen.getByText(/Carlos Mendoza/)).toBeInTheDocument()
  })

  it('llama onSelect con el appointment al hacer click', async () => {
    const onSelect = vi.fn()
    render(<DashboardAppointmentCard appointment={apt} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(apt)
  })

  it('no tiene ningún elemento <a> (no navega)', () => {
    const { container } = render(<DashboardAppointmentCard appointment={apt} onSelect={vi.fn()} />)
    expect(container.querySelector('a')).toBeNull()
  })
})
