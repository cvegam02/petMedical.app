import { render, screen } from '@testing-library/react'
import { FormSection } from '@/components/ui/form-section'

describe('FormSection', () => {
  it('muestra el título de la sección', () => {
    render(<FormSection title="Identidad"><input /></FormSection>)
    expect(screen.getByText('Identidad')).toBeInTheDocument()
  })

  it('renderiza los children', () => {
    render(<FormSection title="Contacto"><span data-testid="child">hijo</span></FormSection>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
