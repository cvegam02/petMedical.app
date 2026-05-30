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

  const { prescriptions, vaccinations, dewormings, weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm, ...rest } = result.data

  const { data: record, error: recordError } = await supabase
    .from('medical_records')
    .insert({
      ...rest,
      weight_kg: weight_kg ?? null,
      temperature_celsius: temperature_celsius ?? null,
      heart_rate_bpm: heart_rate_bpm ?? null,
      respiratory_rate_bpm: respiratory_rate_bpm ?? null,
      tenant_id: profile.tenant_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (recordError) return NextResponse.json({ error: recordError.message }, { status: 500 })

  // MVP: no transaction — if prescriptions fail, the record remains without prescriptions.
  // Production fix: wrap in a Supabase RPC for atomicity.
  if (prescriptions && prescriptions.length > 0) {
    const { error: presError } = await supabase
      .from('prescriptions')
      .insert(prescriptions.map(p => ({ ...p, medical_record_id: record.id })))
    if (presError) return NextResponse.json({ error: presError.message }, { status: 500 })
  }

  // Guardar vacunaciones
  if (vaccinations && vaccinations.length > 0) {
    for (const v of vaccinations) {
      if (!v.vaccine_name?.trim()) continue
      const { vaccine_catalog_id, ...vaccinationRest } = v

      await (supabase as any).from('pet_vaccinations').insert({
        ...vaccinationRest,
        pet_id: rest.pet_id,
        tenant_id: profile.tenant_id,
        applied_by: user.id,
        medical_record_id: record.id,
        ...(vaccine_catalog_id ? { vaccine_catalog_id } : {}),
      })

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
        }
      }
    }
  }

  // Guardar desparasitaciones
  if (dewormings && dewormings.length > 0) {
    const dewormingRows = dewormings
      .filter(d => d.product_name?.trim())
      .map(d => ({
        ...d,
        pet_id: rest.pet_id,
        tenant_id: profile.tenant_id,
        applied_by: user.id,
        medical_record_id: record.id,
      }))
    if (dewormingRows.length > 0) {
      await (supabase as any).from('pet_dewormings').insert(dewormingRows)
    }
  }

  // If appointment_id provided, mark appointment as completed
  if (result.data.appointment_id) {
    await (supabase.from('appointments') as any)
      .update({
        status: 'completed',
        medical_record_id: record.id,
      })
      .eq('id', result.data.appointment_id)
      .eq('tenant_id', profile.tenant_id)
  }

  return NextResponse.json({ data: record }, { status: 201 })
}
