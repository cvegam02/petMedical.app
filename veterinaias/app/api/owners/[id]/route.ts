import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { updateOwnerSchema } from '@/lib/validations/owner'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: owner, error } = await (supabase.from('owners') as any)
    .select('id, full_name, email, phone, address, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Dueño no encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: 'Error al obtener el dueño' }, { status: 500 })

  const { data: registrations } = await (supabase.from('pet_registrations') as any)
    .select(`
      pet:pet_id(
        id, name, sex, date_of_birth, color, microchip, notes, created_at,
        species:species_id(id, name),
        breed:breed_id(id, name)
      )
    `)
    .eq('owner_id', id)

  const pets = (registrations ?? []).map((reg: any) => reg.pet).filter(Boolean)

  return NextResponse.json({ data: { ...owner, pets } })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = updateOwnerSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { email, ...rest } = result.data
  const update: Record<string, unknown> = { ...rest }
  if (email !== undefined) update.email = email || null

  const { data, error } = await (supabase.from('owners') as any)
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Dueño no encontrado' }, { status: 404 })
  if (error?.code === '23505') return NextResponse.json({ error: 'Ya existe un dueño con ese email en tu clínica' }, { status: 409 })
  if (error) return NextResponse.json({ error: 'Error al actualizar el dueño' }, { status: 500 })
  return NextResponse.json({ data })
}
