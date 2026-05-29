import { createClient } from '@/lib/supabase/server'
import { WhatsAppConfigForm } from '@/components/settings/WhatsAppConfigForm'
import { wahaSessionName, wahaGetSession, wahaGetQR } from '@/lib/waha'

export default async function SettingsIntegracionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single() as any

  const tenantId = profile?.tenant_id ?? null

  let initialStatus: 'NOT_CREATED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'STOPPED' = 'NOT_CREATED'
  let initialQr: string | null = null
  let initialPhone: string | null = null

  if (tenantId) {
    const sessionName = wahaSessionName(tenantId)
    const session = await wahaGetSession(sessionName)

    if (session) {
      initialStatus = session.status as typeof initialStatus
      initialPhone = session.me?.id?.user ?? null

      if (session.status === 'SCAN_QR_CODE') {
        const qrData = await wahaGetQR(sessionName)
        if (qrData) {
          initialQr = `data:${qrData.mimeType};base64,${qrData.value}`
        }
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-foreground">Integraciones</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Conecta servicios externos a tu clínica.</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <WhatsAppConfigForm
          initialStatus={initialStatus}
          initialQr={initialQr}
          initialPhone={initialPhone}
        />
      </div>
    </div>
  )
}
