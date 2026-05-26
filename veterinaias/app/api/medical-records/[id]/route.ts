import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { success: validId } = z.string().uuid().safeParse(id)
  if (!validId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('medical_records')
    .select(`
      id, reason, diagnosis, treatment, notes,
      weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm,
      created_at, tenant_id,
      pet:pet_id(id, name, species:species_id(name), owner:owner_id(full_name, phone)),
      created_by_profile:created_by(full_name),
      prescriptions(id, medication_name, dosage, frequency, duration, notes),
      attachments(id, file_name, file_type, storage_path, created_at),
      addendums(id, content, created_at, created_by_profile:created_by(full_name))
    `)
    .eq('id', id)
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
