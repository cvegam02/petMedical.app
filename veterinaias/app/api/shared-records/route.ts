import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(settings)')
    .eq('id', user.id)
    .single() as any

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { record_id } = body
  if (!record_id) return NextResponse.json({ error: 'record_id requerido' }, { status: 400 })

  const expiryDays = profile.tenants?.settings?.share_link_expiry_days ?? 7
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: shared, error } = await (supabase.from('shared_records') as any)
    .insert({ record_id, tenant_id: profile.tenant_id, created_by: user.id, expires_at: expiresAt })
    .select('token')
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear link' }, { status: 500 })

  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('host') ?? 'petmedical.app'
  const url = `${proto}://${host}/r/${shared.token}`

  return NextResponse.json({ token: shared.token, url, expires_at: expiresAt }, { status: 201 })
}
