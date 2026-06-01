import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { medicalRecordSchema } from '@/lib/validations/medical-record'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (profileError) return NextResponse.json({ error: 'Error al verificar el perfil' }, { status: 500 })
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No hay clínica asociada a tu cuenta' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = medicalRecordSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { prescriptions, vaccinations, dewormings, weight_kg, temperature_celsius, attended_by, pet_id, appointment_id } = result.data

  // El veterinario que atiende puede diferir del usuario logueado. Default: el
  // usuario actual. Debe pertenecer al tenant y no ser un asistente.
  const attendedBy = attended_by ?? user.id
  const { data: vet } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', attendedBy)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle() as any
  if (!vet || vet.role === 'assistant') {
    return NextResponse.json({ error: 'El veterinario que atiende no es válido' }, { status: 422 })
  }

  // Resolve owner_id from appointment or pet_registrations
  let ownerId: string | null = null
  if (appointment_id) {
    const { data: appt } = await (supabase as any)
      .from('appointments')
      .select('owner_id')
      .eq('id', appointment_id)
      .eq('tenant_id', profile.tenant_id)
      .single()
    ownerId = appt?.owner_id ?? null
  }
  if (!ownerId) {
    const { data: reg } = await (supabase as any)
      .from('pet_registrations')
      .select('owner_id')
      .eq('pet_id', pet_id)
      .eq('tenant_id', profile.tenant_id)
      .single()
    ownerId = reg?.owner_id ?? null
  }

  if (!ownerId) {
    return NextResponse.json({ error: 'No se pudo determinar el dueño de la mascota' }, { status: 422 })
  }

  // Step 1: Insert service_visit
  const { data: visit, error: visitError } = await (supabase as any)
    .from('service_visits')
    .insert({
      tenant_id: profile.tenant_id,
      pet_id,
      owner_id: ownerId,
      appointment_id: appointment_id ?? null,
      service_type: 'consultation',
      status: 'completed',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select('id')
    .single()

  if (visitError) return NextResponse.json({ error: visitError.message }, { status: 500 })

  const visitId: string = visit.id

  // Step 2: Insert consultation_record
  const { reason, diagnosis, treatment, notes } = result.data
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
    return NextResponse.json({ error: consultError.message }, { status: 500 })
  }

  // Step 3: Save prescriptions
  if (prescriptions && prescriptions.length > 0) {
    const { error: presError } = await (supabase as any)
      .from('prescriptions')
      .insert(prescriptions.map(p => ({ ...p, visit_id: visitId })))
    if (presError) {
      await (supabase as any).from('service_visits').delete().eq('id', visitId)
      return NextResponse.json({ error: presError.message }, { status: 500 })
    }
  }

  // Step 4: Save vaccinations
  if (vaccinations && vaccinations.length > 0) {
    for (const v of vaccinations) {
      if (!v.vaccine_name?.trim()) continue
      const { vaccine_catalog_id, ...vaccinationRest } = v

      const { error: vacError } = await (supabase as any).from('pet_vaccinations').insert({
        ...vaccinationRest,
        pet_id,
        tenant_id: profile.tenant_id,
        applied_by: attendedBy,
        visit_id: visitId,
        ...(vaccine_catalog_id ? { vaccine_catalog_id } : {}),
      })
      if (vacError) {
        await (supabase as any).from('service_visits').delete().eq('id', visitId)
        return NextResponse.json({ error: vacError.message }, { status: 500 })
      }

      // Decrementar stock si viene del catálogo
      if (vaccine_catalog_id) {
        const { data: catalogItem } = await (supabase as any)
          .from('vaccine_catalog')
          .select('stock_quantity')
          .eq('id', vaccine_catalog_id)
          .eq('tenant_id', profile.tenant_id)
          .single()
        if (catalogItem && catalogItem.stock_quantity > 0) {
          await (supabase as any)
            .from('vaccine_catalog')
            .update({ stock_quantity: catalogItem.stock_quantity - 1 })
            .eq('id', vaccine_catalog_id)
            .eq('tenant_id', profile.tenant_id)
            .gt('stock_quantity', 0)
        }
      }
    }
  }

  // Step 5: Save dewormings
  if (dewormings && dewormings.length > 0) {
    const dewormingRows = dewormings
      .filter(d => d.product_name?.trim())
      .map(d => ({
        ...d,
        pet_id,
        tenant_id: profile.tenant_id,
        applied_by: attendedBy,
        visit_id: visitId,
      }))
    if (dewormingRows.length > 0) {
      const { error: dewError } = await (supabase as any).from('pet_dewormings').insert(dewormingRows)
      if (dewError) {
        await (supabase as any).from('service_visits').delete().eq('id', visitId)
        return NextResponse.json({ error: dewError.message }, { status: 500 })
      }
    }
  }

  // Step 6: If appointment_id provided, mark appointment as completed
  if (appointment_id) {
    await (supabase as any)
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointment_id)
      .eq('tenant_id', profile.tenant_id)
  }

  return NextResponse.json({ data: { id: visitId } }, { status: 201 })
}
