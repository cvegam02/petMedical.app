import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { petSchema } from '@/lib/validations/pet'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const ownerId = req.nextUrl.searchParams.get('ownerId')
  const q = req.nextUrl.searchParams.get('q')

  if (ownerId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(ownerId)) {
      return NextResponse.json({ error: 'ownerId inválido' }, { status: 400 })
    }
  }

  let query = (supabase.from('pet_registrations') as any)
    .select(`
      owner:owner_id(id, full_name, phone),
      pet:pet_id(id, name, sex, date_of_birth, species:species_id(id, name), breed:breed_id(id, name))
    `)
    .limit(100)

  if (ownerId) {
    query = query.eq('owner_id', ownerId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Error al obtener mascotas' }, { status: 500 })

  let pets = (data ?? []).map((reg: any) => ({ ...reg.pet, owner: reg.owner }))

  if (q?.trim()) {
    const lower = q.toLowerCase()
    pets = pets.filter((p: any) => p.name?.toLowerCase().includes(lower))
  }

  return NextResponse.json({ data: pets })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = petSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant asignado' }, { status: 403 })

  const { owner_id, date_of_birth, breed_id, ...petData } = result.data

  const { data: pet, error: petError } = await supabase
    .from('pets')
    .insert({ ...petData, date_of_birth: date_of_birth || null, breed_id: breed_id || null })
    .select()
    .single()

  if (petError?.code === '23505') return NextResponse.json({ error: 'Ya existe una mascota con ese microchip' }, { status: 409 })
  if (petError) return NextResponse.json({ error: 'Error al guardar la mascota' }, { status: 500 })

  const { error: regError } = await supabase
    .from('pet_registrations')
    .insert({ tenant_id: profile.tenant_id, pet_id: pet.id, owner_id })

  if (regError) {
    await supabase.from('pets').delete().eq('id', pet.id)
    return NextResponse.json({ error: 'Error al registrar la mascota' }, { status: 500 })
  }

  return NextResponse.json({ data: pet }, { status: 201 })
}
