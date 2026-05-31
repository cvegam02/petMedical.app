import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groomingServiceCatalogSchema } from '@/lib/validations/grooming'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { data, error } = await (supabase as any)
    .from('grooming_service_catalog')
    .select('*')
    .eq('tenant_id', (profile as any).tenant_id)
    .order('name')

  if (error) return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()
  if ((profile as any)?.role !== 'admin')
    return NextResponse.json({ error: 'Solo admins pueden gestionar catálogos' }, { status: 403 })
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const result = groomingServiceCatalogSchema.safeParse(body)
  if (!result.success)
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('grooming_service_catalog')
    .insert({ ...result.data, tenant_id: (profile as any).tenant_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear servicio' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
