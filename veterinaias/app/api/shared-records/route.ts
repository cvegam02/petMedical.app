import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  record_id: z.string().uuid({ message: 'record_id debe ser un UUID válido' }),
})

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

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { record_id } = parsed.data

  // Verify the service_visit belongs to the caller's tenant
  const { data: visit } = await (supabase as any)
    .from('service_visits')
    .select('id')
    .eq('id', record_id)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()
  if (!visit) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })

  const expiryDays = profile.tenants?.settings?.share_link_expiry_days ?? 7
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: shared, error } = await (supabase.from('shared_records') as any)
    .insert({ record_id, tenant_id: profile.tenant_id, created_by: user.id, expires_at: expiresAt })
    .select('token')
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear link' }, { status: 500 })

  const appUrl = (process.env.APP_URL ?? 'https://mundopet.com.mx').replace(/\/$/, '')
  const url = `${appUrl}/r/${shared.token}`

  return NextResponse.json({ token: shared.token, url, expires_at: expiresAt }, { status: 201 })
}
