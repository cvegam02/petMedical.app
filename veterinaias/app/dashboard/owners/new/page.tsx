import { FormPageLayout } from '@/components/ui/form-page-layout'
import { FormContextPanel, ContextCard } from '@/components/ui/form-context-panel'
import { OwnerForm } from '@/components/owners/OwnerForm'

function OwnerNewContext() {
  return (
    <FormContextPanel>
      <ContextCard>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Campos requeridos</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
            <span className="text-destructive">*</span> Nombre
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
            <span className="text-destructive">*</span> Teléfono
          </span>
        </div>
      </ContextCard>
      <ContextCard>
        <p className="text-xs font-semibold text-foreground mb-2">Al crear el dueño</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="text-primary mt-0.5">→</span> Agregar sus mascotas al sistema
          </li>
          <li className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="text-primary mt-0.5">→</span> Agendar citas directamente
          </li>
          <li className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="text-primary mt-0.5">→</span> Registrar consultas y expediente clínico
          </li>
        </ul>
      </ContextCard>
    </FormContextPanel>
  )
}

export default function NewOwnerPage() {
  return (
    <FormPageLayout
      backHref="/dashboard/owners"
      backLabel="Dueños"
      overline="Directorio"
      title="Nuevo dueño"
      contextPanel={<OwnerNewContext />}
    >
      <OwnerForm />
    </FormPageLayout>
  )
}
