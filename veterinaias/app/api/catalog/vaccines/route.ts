import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vaccineCatalogSchema } from '@/lib/validations/catalog'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('vaccine_catalog')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: 'Error al obtener vacunas' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profiles').select('role, tenant_id').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Solo admins pueden gestionar catálogos' }, { status: 403 })
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = vaccineCatalogSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('vaccine_catalog')
    .insert({ ...result.data, tenant_id: (profile as any).tenant_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear vacuna' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
