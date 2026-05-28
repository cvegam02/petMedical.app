import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { walkInConsultationSchema } from '@/lib/validations/medical-record'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant asignado' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const result = walkInConsultationSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  }

  const { pet: petData, record: recordData, owner: ownerInput } = result.data

  // Step 1: Create pet
  const { data: pet, error: petError } = await supabase
    .from('pets')
    .insert({
      name: petData.name,
      species_id: petData.species_id,
      breed_id: petData.breed_id ?? null,
      sex: petData.sex,
      date_of_birth: petData.date_of_birth ?? null,
    })
    .select('id')
    .single()

  if (petError) return NextResponse.json({ error: 'Error al crear la mascota' }, { status: 500 })

  const petId = pet.id

  // Step 2: Resolve owner
  let ownerId: string

  if (ownerInput === null) {
    // Create placeholder owner
    const { data: placeholder, error: placeholderError } = await (supabase.from('owners') as any)
      .insert({ full_name: 'Sin registrar', tenant_id: profile.tenant_id })
      .select('id')
      .single()

    if (placeholderError) {
      await supabase.from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Error al crear dueño' }, { status: 500 })
    }
    ownerId = placeholder.id
  } else if ('id' in ownerInput) {
    // Existing owner
    ownerId = ownerInput.id
  } else {
    // New owner
    const { data: newOwner, error: ownerError } = await (supabase.from('owners') as any)
      .insert({
        full_name: ownerInput.full_name,
        phone: ownerInput.phone ?? null,
        email: ownerInput.email || null,
        tenant_id: profile.tenant_id,
      })
      .select('id')
      .single()

    if (ownerError) {
      await supabase.from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Error al crear el dueño' }, { status: 500 })
    }
    ownerId = newOwner.id
  }

  // Step 3: Create pet_registration
  const { error: regError } = await (supabase.from('pet_registrations') as any)
    .insert({ tenant_id: profile.tenant_id, pet_id: petId, owner_id: ownerId })

  if (regError) {
    await supabase.from('pets').delete().eq('id', petId)
    return NextResponse.json({ error: 'Error al registrar la mascota' }, { status: 500 })
  }

  // Step 4: Create medical record
  const { prescriptions, weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm, ...rest } = recordData

  const { data: record, error: recordError } = await supabase
    .from('medical_records')
    .insert({
      ...rest,
      pet_id: petId,
      weight_kg: weight_kg ?? null,
      temperature_celsius: temperature_celsius ?? null,
      heart_rate_bpm: heart_rate_bpm ?? null,
      respiratory_rate_bpm: respiratory_rate_bpm ?? null,
      tenant_id: profile.tenant_id,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (recordError) {
    await (supabase.from('pet_registrations') as any).delete().eq('pet_id', petId)
    await supabase.from('pets').delete().eq('id', petId)
    return NextResponse.json({ error: 'Error al crear la consulta' }, { status: 500 })
  }

  if (prescriptions && prescriptions.length > 0) {
    await supabase
      .from('prescriptions')
      .insert(prescriptions.map(p => ({ ...p, medical_record_id: record.id })))
  }

  return NextResponse.json({ petId, recordId: record.id }, { status: 201 })
}
