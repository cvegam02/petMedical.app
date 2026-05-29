import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  wahaSessionName,
  wahaGetSession,
  wahaCreateSession,
  wahaRestartSession,
  wahaDeleteSession,
  wahaGetQR,
} from '@/lib/waha'

async function getAdminTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'admin') return null
  return (profile as any)?.tenant_id ?? null
}

// GET — devuelve status + QR (si aplica)
export async function GET() {
  const tenantId = await getAdminTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sessionName = wahaSessionName(tenantId)
  const session = await wahaGetSession(sessionName)

  if (!session) {
    return NextResponse.json({ status: 'NOT_CREATED', qr: null, phone: null })
  }

  let qr: string | null = null
  if (session.status === 'SCAN_QR_CODE') {
    const qrData = await wahaGetQR(sessionName)
    if (qrData) {
      qr = `data:${qrData.mimeType};base64,${qrData.value}`
    }
  }

  const phone = session.me?.id?.user ?? null

  return NextResponse.json({ status: session.status, qr, phone })
}

// POST — crea o reinicia la sesión
export async function POST(_req: NextRequest) {
  const tenantId = await getAdminTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sessionName = wahaSessionName(tenantId)
  const existing = await wahaGetSession(sessionName)

  if (existing) {
    const ok = await wahaRestartSession(sessionName)
    if (!ok) return NextResponse.json({ error: 'No se pudo reiniciar la sesión' }, { status: 500 })
  } else {
    const created = await wahaCreateSession(sessionName)
    if (!created) return NextResponse.json({ error: 'No se pudo crear la sesión' }, { status: 500 })
  }

  // Esperar brevemente y devolver el estado actual
  await new Promise(r => setTimeout(r, 1500))
  const session = await wahaGetSession(sessionName)

  let qr: string | null = null
  if (session?.status === 'SCAN_QR_CODE') {
    const qrData = await wahaGetQR(sessionName)
    if (qrData) qr = `data:${qrData.mimeType};base64,${qrData.value}`
  }

  return NextResponse.json({ status: session?.status ?? 'STARTING', qr, phone: null })
}

// DELETE — desconecta y elimina la sesión
export async function DELETE() {
  const tenantId = await getAdminTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sessionName = wahaSessionName(tenantId)
  await wahaDeleteSession(sessionName)
  return NextResponse.json({ success: true })
}
