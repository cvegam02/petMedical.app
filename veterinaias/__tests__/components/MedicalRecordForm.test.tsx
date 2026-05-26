import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MedicalRecordForm } from '@/components/medical-records/MedicalRecordForm'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

describe('MedicalRecordForm', () => {
  it('renders required fields', () => {
    render(<MedicalRecordForm petId="pet-1" />)
    expect(screen.getByLabelText(/motivo/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
  })

  it('renders prescriptions section', () => {
    render(<MedicalRecordForm petId="pet-1" />)
    expect(screen.getByText(/recetas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar medicamento/i })).toBeInTheDocument()
  })
})
