import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  walkInConsultationSchema,
  walkInConsultationExistingPetSchema,
} from '@/lib/validations/medical-record'

// El veterinario que atiende puede diferir del usuario logueado. Default: el
// usuario actual. Si se elige otro, debe pertenecer al mismo tenant.
async function resolveAttendedBy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string,
  userId: string,
  candidate: string | undefined,
): Promise<{ attendedBy?: string; error?: string }> {
  const attendedBy = candidate ?? userId
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', attendedBy)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!data || data.role === 'assistant') {
    return { error: 'El veterinario que atiende no es válido' }
  }
  return { attendedBy }
}

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

  // ── Existing-pet path ────────────────────────────────────────────────────
  if (body !== null && typeof body === 'object' && 'existingPetId' in body) {
    const result = walkInConsultationExistingPetSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
    }

    const { existingPetId, record: recordData } = result.data

    // Verify pet is registered at this tenant
    const { data: petCheck, error: petCheckError } = await (supabase as any)
      .from('pet_registrations')
      .select('pet_id, owner_id')
      .eq('pet_id', existingPetId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (petCheckError || !petCheck) {
      return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
    }

    const {
      prescriptions,
      vaccinations,
      dewormings,
      weight_kg,
      temperature_celsius,
      attended_by,
      reason,
      diagnosis,
      treatment,
      notes,
    } = recordData

    const { attendedBy, error: vetError } = await resolveAttendedBy(supabase, profile.tenant_id, user.id, attended_by)
    if (vetError) return NextResponse.json({ error: vetError }, { status: 422 })

    // Step 1: Create service_visit
    const { data: visit, error: visitError } = await (supabase as any)
      .from('service_visits')
      .insert({
        tenant_id: profile.tenant_id,
        pet_id: existingPetId,
        owner_id: petCheck.owner_id ?? null,
        appointment_id: null,
        service_type: 'consultation',
        status: 'completed',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select('id')
      .single()

    if (visitError) return NextResponse.json({ error: 'Error al crear la consulta' }, { status: 500 })

    const visitId: string = visit.id

    // Step 2: Create consultation_record
    const { error: consultError } = await (supabase as any)
      .from('consultation_records')
      .insert({
        visit_id: visitId,
        attended_by: attendedBy,
        reason,
        diagnosis: diagnosis ?? null,
        treatment: treatment ?? null,
        notes: notes ?? null,
        weight_kg: weight_kg ?? null,
        temperature_celsius: temperature_celsius ?? null,
      })

    if (consultError) {
      await (supabase as any).from('service_visits').delete().eq('id', visitId)
      return NextResponse.json({ error: 'Error al crear la consulta' }, { status: 500 })
    }

    // Step 3: Save related data
    const tasks: Promise<any>[] = []

    if (prescriptions && prescriptions.length > 0) {
      tasks.push(Promise.resolve((supabase as any).from('prescriptions').insert(prescriptions.map(p => ({ ...p, visit_id: visitId })))))
    }
    if (vaccinations && vaccinations.length > 0) {
      tasks.push(Promise.resolve((supabase as any).from('pet_vaccinations').insert(vaccinations.map(v => ({ ...v, visit_id: visitId, pet_id: existingPetId, tenant_id: profile.tenant_id, applied_by: attendedBy })))))
    }
    if (dewormings && dewormings.length > 0) {
      tasks.push(Promise.resolve((supabase as any).from('pet_dewormings').insert(dewormings.map(d => ({ ...d, visit_id: visitId, pet_id: existingPetId, tenant_id: profile.tenant_id, applied_by: attendedBy })))))
    }

    if (tasks.length > 0) {
      const results = await Promise.all(tasks)
      const failed = results.find(r => r.error)
      if (failed) {
        await (supabase as any).from('service_visits').delete().eq('id', visitId)
        return NextResponse.json({ error: 'Error al guardar datos complementarios' }, { status: 500 })
      }
    }

    return NextResponse.json({ petId: existingPetId, recordId: visitId }, { status: 201 })
  }

  // ── New-pet path ────────────────────────────────────────────────────────
  const result = walkInConsultationSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  }

  const { pet: petData, record: recordData, owner: ownerInput } = result.data

  // Step 1: Create pet
  const { data: pet, error: petError } = await (supabase as any)
    .from('pets')
    .insert({
      name: petData.name,
      species_id: petData.species_id,
      breed: petData.breed ?? null,
      sex: petData.sex,
      date_of_birth: petData.date_of_birth ?? null,
    })
    .select('id')
    .single()

  if (petError) return NextResponse.json({ error: 'Error al crear la mascota' }, { status: 500 })

  const petId = pet.id
  let ownerWasCreated = false

  // Step 2: Resolve owner
  let ownerId: string

  if (ownerInput === null) {
    const { data: placeholder, error: placeholderError } = await (supabase as any)
      .from('owners')
      .insert({ full_name: 'Sin registrar', tenant_id: profile.tenant_id })
      .select('id')
      .single()

    if (placeholderError) {
      await (supabase as any).from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Error al crear dueño temporal' }, { status: 500 })
    }
    ownerId = placeholder.id
    ownerWasCreated = true
  } else if ('id' in ownerInput) {
    const { data: ownerCheck } = await (supabase as any)
      .from('owners')
      .select('id')
      .eq('id', ownerInput.id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!ownerCheck) {
      await (supabase as any).from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Dueño no encontrado' }, { status: 404 })
    }
    ownerId = ownerInput.id
  } else {
    const { data: newOwner, error: ownerError } = await (supabase as any)
      .from('owners')
      .insert({
        full_name: ownerInput.full_name,
        phone: ownerInput.phone ?? null,
        email: ownerInput.email ?? null,
        tenant_id: profile.tenant_id,
      })
      .select('id')
      .single()

    if (ownerError) {
      await (supabase as any).from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Error al crear el dueño' }, { status: 500 })
    }
    ownerId = newOwner.id
    ownerWasCreated = true
  }

  // Step 3: Create pet_registration
  const { error: regError } = await (supabase as any)
    .from('pet_registrations')
    .insert({ tenant_id: profile.tenant_id, pet_id: petId, owner_id: ownerId })

  if (regError) {
    if (ownerWasCreated) await (supabase as any).from('owners').delete().eq('id', ownerId)
    await (supabase as any).from('pets').delete().eq('id', petId)
    return NextResponse.json({ error: 'Error al registrar la mascota' }, { status: 500 })
  }

  // Step 4: Resolve vet
  const {
    prescriptions,
    vaccinations,
    dewormings,
    weight_kg,
    temperature_celsius,
    attended_by,
    reason,
    diagnosis,
    treatment,
    notes,
  } = recordData

  const { attendedBy, error: vetError } = await resolveAttendedBy(supabase, profile.tenant_id, user.id, attended_by)
  if (vetError) {
    await (supabase as any).from('pet_registrations').delete().eq('pet_id', petId)
    if (ownerWasCreated) await (supabase as any).from('owners').delete().eq('id', ownerId)
    await (supabase as any).from('pets').delete().eq('id', petId)
    return NextResponse.json({ error: vetError }, { status: 422 })
  }

  // Step 5: Create service_visit
  const { data: visit, error: visitError } = await (supabase as any)
    .from('service_visits')
    .insert({
      tenant_id: profile.tenant_id,
      pet_id: petId,
      owner_id: ownerId,
      appointment_id: null,
      service_type: 'consultation',
      status: 'completed',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select('id')
    .single()

  if (visitError) {
    await (supabase as any).from('pet_registrations').delete().eq('pet_id', petId)
    if (ownerWasCreated) await (supabase as any).from('owners').delete().eq('id', ownerId)
    await (supabase as any).from('pets').delete().eq('id', petId)
    return NextResponse.json({ error: 'Error al crear la consulta' }, { status: 500 })
  }

  const visitId: string = visit.id

  // Step 6: Create consultation_record
  const { error: consultError } = await (supabase as any)
    .from('consultation_records')
    .insert({
      visit_id: visitId,
      attended_by: attendedBy,
      reason,
      diagnosis: diagnosis ?? null,
      treatment: treatment ?? null,
      notes: notes ?? null,
      weight_kg: weight_kg ?? null,
      temperature_celsius: temperature_celsius ?? null,
    })

  if (consultError) {
    await (supabase as any).from('service_visits').delete().eq('id', visitId)
    await (supabase as any).from('pet_registrations').delete().eq('pet_id', petId)
    if (ownerWasCreated) await (supabase as any).from('owners').delete().eq('id', ownerId)
    await (supabase as any).from('pets').delete().eq('id', petId)
    return NextResponse.json({ error: 'Error al crear la consulta' }, { status: 500 })
  }

  // Step 7: Save related data
  const tasks: Promise<any>[] = []

  if (prescriptions && prescriptions.length > 0) {
    tasks.push(Promise.resolve((supabase as any).from('prescriptions').insert(prescriptions.map(p => ({ ...p, visit_id: visitId })))))
  }
  if (vaccinations && vaccinations.length > 0) {
    tasks.push(Promise.resolve((supabase as any).from('pet_vaccinations').insert(vaccinations.map(v => ({ ...v, visit_id: visitId, pet_id: petId, tenant_id: profile.tenant_id, applied_by: attendedBy })))))
  }
  if (dewormings && dewormings.length > 0) {
    tasks.push(Promise.resolve((supabase as any).from('pet_dewormings').insert(dewormings.map(d => ({ ...d, visit_id: visitId, pet_id: petId, tenant_id: profile.tenant_id, applied_by: attendedBy })))))
  }

  if (tasks.length > 0) {
    const results = await Promise.all(tasks)
    const failed = results.find(r => r.error)
    if (failed) {
      await (supabase as any).from('service_visits').delete().eq('id', visitId)
      await (supabase as any).from('pet_registrations').delete().eq('pet_id', petId)
      if (ownerWasCreated) await (supabase as any).from('owners').delete().eq('id', ownerId)
      await (supabase as any).from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Error al guardar datos complementarios' }, { status: 500 })
    }
  }

  return NextResponse.json({ petId, recordId: visitId }, { status: 201 })
}
