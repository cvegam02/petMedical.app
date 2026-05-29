import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NextAppointmentCard } from '@/components/dashboard/NextAppointmentCard'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

const apt: DashboardAppointment = {
  id: 'apt-1',
  status: 'confirmed',
  scheduled_at: '2026-05-27T10:30:00.000Z',
  duration_minutes: 30,
  reason: 'Vacunación anual',
  pet: { id: 'pet-1', name: 'Luna', species: { name: 'Perro' } },
  owner: { id: 'owner-1', full_name: 'Carlos Mendoza', phone: '5551234567' },
  assigned_to_profile: null,
}

describe('NextAppointmentCard', () => {
  it('muestra la etiqueta "Siguiente consulta"', () => {
    render(<NextAppointmentCard appointment={apt} />)
    expect(screen.getByText(/siguiente consulta/i)).toBeInTheDocument()
  })

  it('muestra el nombre de la mascota', () => {
    render(<NextAppointmentCard appointment={apt} />)
    expect(screen.getByText('Luna')).toBeInTheDocument()
  })

  it('muestra el nombre del dueño', () => {
    render(<NextAppointmentCard appointment={apt} />)
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument()
  })

  it('muestra el motivo de consulta', () => {
    render(<NextAppointmentCard appointment={apt} />)
    expect(screen.getByText(/vacunación anual/i)).toBeInTheDocument()
  })

  it('el botón "Iniciar consulta" lleva a records/new con appointmentId', () => {
    render(<NextAppointmentCard appointment={apt} />)
    const link = screen.getByRole('link', { name: /iniciar consulta/i })
    expect(link).toHaveAttribute('href', '/dashboard/pets/pet-1/records/new?appointmentId=apt-1')
  })

  it('llama a onSelect al hacer click en la tarjeta', () => {
    const onSelect = vi.fn()
    render(<NextAppointmentCard appointment={apt} onSelect={onSelect} />)
    
    // El botón es el contenedor principal ahora
    const cardButton = screen.getByRole('button', { name: /siguiente consulta/i })
    fireEvent.click(cardButton)
    
    expect(onSelect).toHaveBeenCalledWith(apt)
  })

  it('funciona con cita scheduled', () => {
    render(<NextAppointmentCard appointment={{ ...apt, status: 'scheduled' }} />)
    expect(screen.getByRole('link', { name: /iniciar consulta/i })).toBeInTheDocument()
  })
})
