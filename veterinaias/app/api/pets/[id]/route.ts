import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { updatePetSchema } from '@/lib/validations/pet'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const [petResult, regResult] = await Promise.all([
    supabase
      .from('pets')
      .select(`
        id, name, sex, date_of_birth, color, microchip, notes, sterilized, habitat, feeding, cohabitation, cohabitation_details, created_at, updated_at,
        species:species_id(id, name),
        breed,
        medical_records(
          id, reason, diagnosis, treatment, notes,
          weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm,
          created_at, tenant_id,
          created_by_profile:created_by(full_name),
          prescriptions(id, medication_name, dosage, frequency, duration, notes),
          attachments(id, file_name, file_type, storage_path, created_at),
          addendums(id, content, created_at, created_by_profile:created_by(full_name))
        )
      `)
      .eq('id', id)
      .order('created_at', { referencedTable: 'medical_records', ascending: false })
      .single(),
    (supabase as any)
      .from('pet_registrations')
      .select('owner:owner_id(id, full_name, email, phone)')
      .eq('pet_id', id)
      .maybeSingle(),
  ])

  if (petResult.error?.code === 'PGRST116') return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
  if (petResult.error) return NextResponse.json({ error: 'Error al obtener la mascota' }, { status: 500 })

  const data = {
    ...(petResult.data as Record<string, unknown>),
    owner: regResult.data?.owner ?? null,
  }

  return NextResponse.json({ data })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = updatePetSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  if (Object.keys(result.data).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 422 })
  }

  const { date_of_birth, breed, microchip, sterilized, habitat, feeding, cohabitation, cohabitation_details, ...rest } = result.data
  const update: Record<string, unknown> = { ...rest }
  if (microchip !== undefined) update.microchip = microchip || null
  if (date_of_birth !== undefined) update.date_of_birth = date_of_birth || null
  if (breed !== undefined) update.breed = breed || null
  if (sterilized !== undefined) update.sterilized = sterilized
  if (habitat !== undefined) update.habitat = habitat || null
  if (feeding !== undefined) update.feeding = feeding || null
  if (cohabitation !== undefined) update.cohabitation = cohabitation
  if (cohabitation_details !== undefined) update.cohabitation_details = cohabitation_details || null

  const { data, error } = await (supabase.from('pets') as any)
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
  if (error?.code === '23505') return NextResponse.json({ error: 'Ya existe una mascota con ese microchip' }, { status: 409 })
  if (error) return NextResponse.json({ error: 'Error al actualizar la mascota' }, { status: 500 })
  return NextResponse.json({ data })
}
