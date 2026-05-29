import { WhatsAppConfigForm } from '@/components/settings/WhatsAppConfigForm'

export default async function SettingsIntegracionesPage() {
  // Fetch initial session status server-side
  let initialStatus: 'NOT_CREATED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'STOPPED' = 'NOT_CREATED'
  let initialQr: string | null = null
  let initialPhone: string | null = null

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/settings/whatsapp/session`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      initialStatus = data.status ?? 'NOT_CREATED'
      initialQr = data.qr ?? null
      initialPhone = data.phone ?? null
    }
  } catch {
    // fallback to NOT_CREATED; client will poll anyway
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
