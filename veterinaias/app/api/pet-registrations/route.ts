import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  pet_id:   z.string().uuid('pet_id inválido'),
  owner_id: z.string().uuid('owner_id inválido'),
  notes:    z.string().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = schema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant asignado' }, { status: 403 })

  const { data, error } = await supabase
    .from('pet_registrations')
    .insert({ tenant_id: profile.tenant_id, ...result.data })
    .select()
    .single()

  if (error?.code === '23505') return NextResponse.json({ error: 'Esta mascota ya está registrada en tu clínica' }, { status: 409 })
  if (error) return NextResponse.json({ error: 'Error al registrar la mascota' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
