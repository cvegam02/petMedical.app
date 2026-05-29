import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { wahaSessionName, wahaGetSession } from '@/lib/waha'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = (profile as any)?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  const sessionName = wahaSessionName(tenantId)
  const session = await wahaGetSession(sessionName)

  if (!session) {
    return NextResponse.json({ error: 'Sesión no encontrada. Ve a Integraciones → Conectar.' }, { status: 400 })
  }

  if (session.status !== 'WORKING') {
    return NextResponse.json({
      error: `Sesión en estado ${session.status}. Escanea el QR para conectar.`,
    }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    phone: session.me?.id?.user ?? 'Número conectado',
  })
}
