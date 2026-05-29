import { createClient } from '@/lib/supabase/server'
import { ConfiguracionForm } from '@/components/settings/ConfiguracionForm'

export default async function SettingsConfiguracionPage() {
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
        <h2 className="text-base font-semibold text-foreground">Configuración general</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Ajusta el comportamiento de la plataforma para tu clínica.</p>
      </div>
      <ConfiguracionForm
        confirmationReminderDays={settings.confirmation_reminder_days ?? 2}
        shareLinkExpiryDays={settings.share_link_expiry_days ?? 7}
      />
    </div>
  )
}
