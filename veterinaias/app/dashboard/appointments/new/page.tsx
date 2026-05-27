import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FormPageLayout } from '@/components/ui/form-page-layout'
import { FormContextPanel, ContextCard } from '@/components/ui/form-context-panel'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'

function AppointmentContext() {
  return (
    <FormContextPanel>
      <ContextCard>
        <p className="text-xs font-semibold text-foreground mb-3">Flujo de la cita</p>
        <ol className="space-y-2">
          {[
            { n: 1, text: 'Crear cita', done: true },
            { n: 2, text: 'Confirmar con el dueño', done: false },
            { n: 3, text: 'Registrar consulta', done: false },
          ].map(step => (
            <li key={step.n} className="flex items-center gap-2.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border border-border'}`}>
                {step.n}
              </span>
              <span className={`text-xs ${step.done ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{step.text}</span>
            </li>
          ))}
        </ol>
      </ContextCard>
      <ContextCard>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Campos requeridos</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['Dueño', 'Mascota', 'Fecha y hora'].map(f => (
            <span key={f} className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
              <span className="text-destructive">*</span> {f}
            </span>
          ))}
        </div>
      </ContextCard>
    </FormContextPanel>
  )
}

export default async function NewAppointmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('full_name')

  return (
    <FormPageLayout
      backHref="/dashboard/appointments"
      backLabel="Citas"
      overline="Agenda"
      title="Nueva cita"
      contextPanel={<AppointmentContext />}
    >
      <AppointmentForm team={(team as any[]) ?? []} />
    </FormPageLayout>
  )
}
