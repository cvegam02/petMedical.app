import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { addendumSchema } from '@/lib/validations/medical-record'
import { z } from 'zod'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { success: validId } = z.string().uuid().safeParse(id)
  if (!validId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = addendumSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data: visit, error: visitError } = await (supabase as any)
    .from('service_visits')
    .select('id')
    .eq('id', id)
    .eq('service_type', 'consultation')
    .single()

  if (visitError || !visit) return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 })

  const { data, error } = await (supabase as any)
    .from('addendums')
    .insert({ visit_id: id, content: result.data.content, created_by: user.id })
    .select('id, content, created_at, created_by_profile:created_by(full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
