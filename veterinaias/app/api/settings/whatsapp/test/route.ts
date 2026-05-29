import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(settings)')
    .eq('id', user.id)
    .single() as any

  const config = profile?.tenants?.settings?.whatsapp_config
  if (!config?.phone_number_id || !config?.access_token) {
    return NextResponse.json({ error: 'WhatsApp no configurado' }, { status: 400 })
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${config.phone_number_id}`,
    { headers: { Authorization: `Bearer ${config.access_token}` } }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({
      error: 'Credenciales inválidas',
      detail: (err as any)?.error?.message,
    }, { status: 400 })
  }

  const data = await res.json()
  return NextResponse.json({
    success: true,
    phone: (data as any).display_phone_number ?? 'Número verificado',
  })
}
