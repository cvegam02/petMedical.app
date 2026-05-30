import { createClient } from '@/lib/supabase/server'
import { PrescriptionConfigForm } from '@/components/settings/PrescriptionConfigForm'

export default async function SettingsRecetasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(settings)')
    .eq('id', user.id)
    .single() as any

  const settings = profile?.tenants?.settings ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Recetas</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Configura los textos opcionales que aparecen en las recetas impresas.</p>
      </div>
      <PrescriptionConfigForm
        footerNote={settings.prescription_footer_note ?? null}
        validityDays={settings.prescription_validity_days ?? null}
      />
    </div>
  )
}
