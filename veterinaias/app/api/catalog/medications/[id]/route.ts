import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateMedicationCatalogSchema } from '@/lib/validations/catalog'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: profile } = await supabase.from('user_profiles').select('role, tenant_id').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })
  const tenantId = (profile as any).tenant_id as string

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = updateMedicationCatalogSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('medication_catalog')
    .update(result.data)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: profile } = await supabase.from('user_profiles').select('role, tenant_id').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })
  const tenantId = (profile as any).tenant_id as string

  const { data, error } = await (supabase as any)
    .from('medication_catalog')
    .update({ active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: 'Error al archivar' }, { status: 500 })
  return NextResponse.json({ data })
}
