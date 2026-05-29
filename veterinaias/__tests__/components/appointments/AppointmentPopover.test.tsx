import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppointmentPopover } from '@/components/appointments/AppointmentPopover'

const apt = {
  id: 'apt-1',
  status: 'confirmed',
  scheduled_at: '2026-06-15T10:00:00Z',
  duration_minutes: 30,
  reason: 'Vacunación',
  pet: { id: 'pet-1', name: 'Luna', species: { name: 'Perro' } },
  owner: { id: 'owner-1', full_name: 'Carlos Mendoza', phone: '5551234567' },
}

describe('AppointmentPopover', () => {
  it('renderiza el trigger sin explotar', () => {
    render(
      <AppointmentPopover appointment={apt}>
        <button>Trigger</button>
      </AppointmentPopover>
    )
    expect(screen.getByText('Trigger')).toBeInTheDocument()
  })
})
