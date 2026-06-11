import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  const tenantId = (profile as any)?.tenant_id as string
  if (!tenantId) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('logo') as File | null
  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const allowed = ['png', 'jpg', 'jpeg', 'webp', 'svg']
  if (!allowed.includes(ext)) return NextResponse.json({ error: 'Formato no permitido' }, { status: 400 })

  const path = `${tenantId}/logo.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('tenant-logos')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('tenant-logos').getPublicUrl(path)
  const logoUrl = `${publicUrl}?t=${Date.now()}`

  const { data: current } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  const { error: settingsError } = await supabase
    .from('tenants')
    .update({ settings: { ...((current as any)?.settings ?? {}), logo_url: logoUrl } })
    .eq('id', tenantId)

  if (settingsError) return NextResponse.json({ error: 'Error al guardar URL' }, { status: 500 })

  revalidateTag('profiles', 'max')

  return NextResponse.json({ logo_url: logoUrl })
}
