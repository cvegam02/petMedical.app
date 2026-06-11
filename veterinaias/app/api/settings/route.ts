import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { TenantSettings } from '@/lib/types/database'

const patchBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z.object({
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    confirmation_reminder_days: z.number().int().min(1).max(30).optional(),
    share_link_expiry_days: z.number().int().min(1).max(365).optional(),
    prescription_footer_note: z.string().nullable().optional(),
    prescription_validity_days: z.number().int().min(1).max(365).nullable().optional(),
    business_hours: z.record(z.string(), z.unknown()).optional(),
    appointment_duration_minutes: z.number().int().min(5).max(480).optional(),
    allow_walk_ins: z.boolean().optional(),
  }).optional(),
})

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

  let rawBody: unknown
  try { rawBody = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = patchBodySchema.safeParse(rawBody)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const body = parsed.data
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

  revalidateTag('profiles', 'max')

  return NextResponse.json({ data })
}
