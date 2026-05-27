import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { petSchema } from '@/lib/validations/pet'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const ownerId = req.nextUrl.searchParams.get('ownerId')

  if (ownerId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(ownerId)) {
      return NextResponse.json({ error: 'ownerId inválido' }, { status: 400 })
    }
  }

  const q = req.nextUrl.searchParams.get('q')

  let query = (supabase.from('pets') as any)
    .select('id, name, sex, date_of_birth, species:species_id(id, name), breed:breed_id(id, name), owner:owner_id(id, full_name)')
    .order('name')
    .limit(100)

  if (ownerId) {
    query = query.eq('owner_id', ownerId)
  }

  if (q && q.trim()) {
    const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.ilike('name', `%${escaped}%`)
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

  const result = petSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { date_of_birth, breed_id, ...rest } = result.data
  const { data, error } = await supabase
    .from('pets')
    .insert({ ...rest, date_of_birth: date_of_birth || null, breed_id: breed_id || null })
    .select()
    .single()

  if (error?.code === '23505') return NextResponse.json({ error: 'Ya existe una mascota con ese microchip' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
