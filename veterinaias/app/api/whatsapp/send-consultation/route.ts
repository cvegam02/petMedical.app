import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { wahaSessionName, wahaGetSession, wahaSendText } from '@/lib/waha'

const bodySchema = z.object({
  record_id: z.string().uuid({ message: 'record_id debe ser un UUID válido' }),
  phone: z.string().regex(/^\d{7,15}$/, { message: 'Teléfono inválido — solo dígitos, 7–15 caracteres' }),
  pet_name: z.string().max(100).optional(),
})

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

  const sessionName = wahaSessionName(profile.tenant_id)
  const session = await wahaGetSession(sessionName)

  if (!session || session.status !== 'WORKING') {
    return NextResponse.json({
      error: 'WhatsApp no conectado. Ve a Configuración → Integraciones para conectar.',
    }, { status: 400 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { record_id, phone, pet_name } = parsed.data

  // Verify the visit belongs to the caller's tenant
  const { data: visit } = await (supabase as any)
    .from('service_visits')
    .select('id')
    .eq('id', record_id)
    .eq('tenant_id', profile.tenant_id)
    .eq('service_type', 'consultation')
    .single()
  if (!visit) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })

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
  const petLabel = pet_name ?? 'tu mascota'
  const message = `Hola 👋 Te compartimos el resumen de la consulta de *${petLabel}* en *${clinicName}*:\n\n${shareUrl}\n\n_Este enlace expira en ${expiryDays} días._`

  const sent = await wahaSendText(sessionName, phone, message)

  if (!sent) {
    return NextResponse.json({ error: 'No se pudo enviar el mensaje por WhatsApp' }, { status: 500 })
  }

  return NextResponse.json({ success: true, share_url: shareUrl })
}
