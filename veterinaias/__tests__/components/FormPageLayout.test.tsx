import { render, screen } from '@testing-library/react'
import { FormPageLayout } from '@/components/ui/form-page-layout'

vi.mock('next/navigation', () => ({ useRouter: () => ({}) }))

describe('FormPageLayout', () => {
  it('muestra breadcrumb con backLabel y title', () => {
    render(
      <FormPageLayout backHref="/dashboard/owners" backLabel="Dueños" overline="Directorio" title="Nuevo dueño">
        <div>form</div>
      </FormPageLayout>
    )
    expect(screen.getByText('Dueños')).toBeInTheDocument()
    expect(screen.getAllByText('Nuevo dueño').length).toBeGreaterThanOrEqual(1)
  })

  it('muestra el overline', () => {
    render(
      <FormPageLayout backHref="/dashboard/owners" backLabel="Dueños" overline="Directorio" title="Nuevo dueño">
        <div>form</div>
      </FormPageLayout>
    )
    expect(screen.getByText('Directorio')).toBeInTheDocument()
  })

  it('renderiza el contextPanel cuando se pasa', () => {
    render(
      <FormPageLayout
        backHref="/dashboard/owners"
        backLabel="Dueños"
        overline="Directorio"
        title="Nuevo dueño"
        contextPanel={<div data-testid="panel">panel</div>}
      >
        <div>form</div>
      </FormPageLayout>
    )
    expect(screen.getByTestId('panel')).toBeInTheDocument()
  })
})
