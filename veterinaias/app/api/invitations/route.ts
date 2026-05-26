import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Email invalido'),
  role: z.enum(['staff', 'doctor', 'assistant'], {
    errorMap: () => ({ message: 'Rol invalido' }),
  }),
})

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos para invitar usuarios' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud invalido' }, { status: 400 })
  }
  const result = inviteSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: invitation, error } = await admin
    .from('invitations')
    .insert({
      tenant_id: profile.tenant_id,
      email: result.data.email,
      role: result.data.role,
      invited_by: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una invitacion para ese email' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al crear invitacion' }, { status: 500 })
  }

  return NextResponse.json({ invitation }, { status: 201 })
}
