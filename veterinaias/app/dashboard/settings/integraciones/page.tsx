import { createClient } from '@/lib/supabase/server'
import { WhatsAppConfigForm } from '@/components/settings/WhatsAppConfigForm'

export default async function SettingsIntegracionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(settings)')
    .eq('id', user.id)
    .single() as any

  const waConfig = profile?.tenants?.settings?.whatsapp_config ?? {}

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-foreground">Integraciones</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Conecta servicios externos a tu clínica.</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <WhatsAppConfigForm
          phoneNumberId={waConfig.phone_number_id ?? null}
          hasToken={!!waConfig.access_token}
        />
      </div>
    </div>
  )
}
