import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { tenantSchema, generateSlug } from '@/lib/validations/tenant'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const result = tenantSchema.safeParse(body)

  if (!result.success) {
    const firstError = result.error.issues[0]
    return NextResponse.json({ error: firstError.message }, { status: 400 })
  }

  const { name, type } = result.data
  const slug = generateSlug(name)
  const admin = createAdminClient()

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ name, slug, type })
    .select()
    .single()

  if (tenantError) {
    if (tenantError.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una clinica con ese nombre' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al crear la clinica' }, { status: 500 })
  }

  const { error: profileError } = await admin
    .from('user_profiles')
    .update({ tenant_id: tenant.id, role: 'admin' })
    .eq('id', user.id)

  if (profileError) {
    return NextResponse.json({ error: 'Error al configurar el perfil' }, { status: 500 })
  }

  return NextResponse.json({ tenant }, { status: 201 })
}
