import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { firstVisitSchema } from '@/lib/validations/appointment'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { data: tenantData } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', profile.tenant_id)
    .single()

  const businessHours = (tenantData?.settings as any)?.business_hours ?? DEFAULT_BUSINESS_HOURS
  const slotInterval: number = businessHours.slot_interval

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = firstVisitSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { pet_name, scheduled_at, reason, notes, assigned_to } = result.data
  const duration_minutes = result.data.duration_minutes ?? slotInterval

  // Step 1: Create stub owner (no phone, no email — marks profile as incomplete)
  const { data: owner, error: ownerError } = await (supabase.from('owners') as any)
    .insert({
      full_name: `Dueño de ${pet_name}`,
      phone: null,
      email: null,
      tenant_id: profile.tenant_id,
    })
    .select('id')
    .single()
  if (ownerError) return NextResponse.json({ error: 'Error al crear el dueño' }, { status: 500 })

  // Step 2: Create stub pet (no species_id — filled during consultation)
  const { data: pet, error: petError } = await (supabase.from('pets') as any)
    .insert({ name: pet_name, sex: 'unknown' })
    .select('id')
    .single()
  if (petError) {
    const { error: cleanupErr } = await (supabase.from('owners') as any)
      .delete().eq('id', owner.id).eq('tenant_id', profile.tenant_id)
    if (cleanupErr) console.error('first-visit cleanup failed (owner):', cleanupErr)
    return NextResponse.json({ error: 'Error al crear la mascota' }, { status: 500 })
  }

  // Step 3: Register pet under this tenant
  const { error: regError } = await supabase
    .from('pet_registrations')
    .insert({ tenant_id: profile.tenant_id, pet_id: pet.id, owner_id: owner.id })
  if (regError) {
    const [petDel, ownerDel] = await Promise.all([
      (supabase.from('pets') as any).delete().eq('id', pet.id),
      (supabase.from('owners') as any).delete().eq('id', owner.id).eq('tenant_id', profile.tenant_id),
    ])
    if (petDel.error) console.error('first-visit cleanup failed (pet):', petDel.error)
    if (ownerDel.error) console.error('first-visit cleanup failed (owner):', ownerDel.error)
    return NextResponse.json({ error: 'Error al registrar la mascota' }, { status: 500 })
  }

  // Step 4: Create appointment
  const { data: appointment, error: aptError } = await (supabase.from('appointments') as any)
    .insert({
      pet_id: pet.id,
      owner_id: owner.id,
      tenant_id: profile.tenant_id,
      scheduled_at,
      duration_minutes,
      reason: reason ?? null,
      notes: notes ?? null,
      assigned_to: assigned_to ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (aptError) {
    const [regDel, petDel, ownerDel] = await Promise.all([
      supabase.from('pet_registrations').delete().eq('pet_id', pet.id).eq('tenant_id', profile.tenant_id),
      (supabase.from('pets') as any).delete().eq('id', pet.id),
      (supabase.from('owners') as any).delete().eq('id', owner.id).eq('tenant_id', profile.tenant_id),
    ])
    if (regDel.error) console.error('first-visit cleanup failed (registration):', regDel.error)
    if (petDel.error) console.error('first-visit cleanup failed (pet):', petDel.error)
    if (ownerDel.error) console.error('first-visit cleanup failed (owner):', ownerDel.error)
    return NextResponse.json({ error: 'Error al crear la cita' }, { status: 500 })
  }

  return NextResponse.json(
    { data: { id: appointment.id, pet_id: pet.id, owner_id: owner.id } },
    { status: 201 }
  )
}
