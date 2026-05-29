import { createClient } from '@/lib/supabase/server'
import { ClinicaForm } from '@/components/settings/ClinicaForm'

export default async function SettingsClinicaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(name, settings)')
    .eq('id', user.id)
    .single() as any

  const tenant = profile?.tenants
  const settings = tenant?.settings ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Datos de la clínica</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Esta información aparece en PDFs y documentos generados.</p>
      </div>
      <ClinicaForm name={tenant?.name ?? ''} address={settings.address ?? null} phone={settings.phone ?? null} />
    </div>
  )
}
