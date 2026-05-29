import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TenantSettings } from '@/lib/types/database'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  const tenantId = (profile as any).tenant_id as string

  let body: { name?: string; settings?: Record<string, unknown> }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const updates: { name?: string; settings?: TenantSettings } = {}

  if (body.name !== undefined) updates.name = body.name

  if (body.settings !== undefined) {
    const { data: current } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single()
    updates.settings = { ...((current as any)?.settings ?? {}), ...body.settings } as TenantSettings
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select('id, name, settings')
    .single()

  if (error) return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  return NextResponse.json({ data })
}
