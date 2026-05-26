import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ownerSchema } from '@/lib/validations/owner'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')
  let query = supabase
    .from('owners')
    .select('id, full_name, email, phone, created_at')
    .order('full_name')
    .limit(50)

  if (q && q.trim()) {
    const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.or(`full_name.ilike.%${escaped}%,phone.ilike.%${escaped}%,email.ilike.%${escaped}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = ownerSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { email, ...rest } = result.data
  const { data, error } = await supabase
    .from('owners')
    .insert({ ...rest, email: email || null })
    .select()
    .single()

  if (error?.code === '23505') return NextResponse.json({ error: 'Ya existe un dueño con ese email' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
