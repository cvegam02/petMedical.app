import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema } from '@/lib/validations/profile'
import { roleRequiresLicense } from '@/lib/auth/roles'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = updateProfileSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data: current } = await supabase
    .from('user_profiles')
    .select('role, professional_license, is_super_admin')
    .eq('id', user.id)
    .single() as any

  const { full_name, phone, professional_license, professional_address } = result.data

  // La cédula es obligatoria para roles que ejercen como veterinario.
  if (!current?.is_super_admin && roleRequiresLicense(current?.role)) {
    const effectiveLicense = professional_license !== undefined
      ? professional_license
      : current?.professional_license
    if (!effectiveLicense?.trim()) {
      return NextResponse.json({ error: 'La cédula profesional es obligatoria' }, { status: 422 })
    }
  }

  const update: Record<string, unknown> = {}
  if (full_name !== undefined) update.full_name = full_name
  if (phone !== undefined) update.phone = phone || null
  if (professional_license !== undefined) update.professional_license = professional_license || null
  if (professional_address !== undefined) update.professional_address = professional_address || null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  const { data, error } = await (supabase.from('user_profiles') as any)
    .update(update)
    .eq('id', user.id)
    .select('id, full_name, phone, professional_license, professional_address')
    .single()

  if (error) return NextResponse.json({ error: 'Error al guardar el perfil' }, { status: 500 })
  return NextResponse.json({ data })
}
