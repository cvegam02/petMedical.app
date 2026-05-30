import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { wahaSessionName, wahaGetSession, wahaSendText } from '@/lib/waha'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(name, settings)')
    .eq('id', user.id)
    .single() as any

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  // Verificar que la sesión WAHA esté activa
  const sessionName = wahaSessionName(profile.tenant_id)
  const session = await wahaGetSession(sessionName)

  if (!session || session.status !== 'WORKING') {
    return NextResponse.json({
      error: 'WhatsApp no conectado. Ve a Configuración → Integraciones para conectar.',
    }, { status: 400 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { record_id, phone, pet_name } = body
  if (!record_id || !phone) return NextResponse.json({ error: 'record_id y phone son requeridos' }, { status: 400 })

  const { data: record } = await (supabase.from('medical_records') as any)
    .select('id')
    .eq('id', record_id)
    .single()
  if (!record) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })

  const expiryDays: number = profile.tenants?.settings?.share_link_expiry_days ?? 7
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: shared, error: sharedError } = await (supabase.from('shared_records') as any)
    .insert({ record_id, tenant_id: profile.tenant_id, created_by: user.id, expires_at: expiresAt })
    .select('token')
    .single()

  if (sharedError) return NextResponse.json({ error: 'Error al generar link compartible' }, { status: 500 })

  const appUrl = (process.env.APP_URL ?? 'https://mundopet.com.mx').replace(/\/$/, '')
  const shareUrl = `${appUrl}/r/${shared.token}`

  const clinicName: string = profile.tenants?.name ?? 'tu clínica'
  const message = `Hola 👋 Te compartimos el resumen de la consulta de *${pet_name ?? 'tu mascota'}* en *${clinicName}*:\n\n${shareUrl}\n\n_Este enlace expira en ${expiryDays} días._`

  const sent = await wahaSendText(sessionName, phone, message)

  if (!sent) {
    return NextResponse.json({ error: 'No se pudo enviar el mensaje por WhatsApp' }, { status: 500 })
  }

  return NextResponse.json({ success: true, share_url: shareUrl })
}
