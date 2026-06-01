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

  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { data: visit, error } = await (supabase as any)
    .from('service_visits')
    .select(`
      id, pet_id, owner_id, appointment_id, status, started_at, created_at,
      consultation:consultation_records(
        attended_by, reason, diagnosis, treatment, notes,
        weight_kg, temperature_celsius
      ),
      pet:pet_id(id, name, species:species_id(name), owner:owner_id(full_name, phone)),
      prescriptions(id, medication_name, dosage, frequency, duration, notes),
      attachments(id, file_name, file_type, storage_path, created_at),
      addendums(id, content, created_at, created_by_profile:created_by(full_name))
    `)
    .eq('id', id)
    .eq('service_type', 'consultation')
    .eq('tenant_id', (profile as any).tenant_id)
    .single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const consultation = visit.consultation ?? {}
  const data = {
    id: visit.id,
    pet_id: visit.pet_id,
    owner_id: visit.owner_id,
    appointment_id: visit.appointment_id,
    status: visit.status,
    started_at: visit.started_at,
    created_at: visit.created_at,
    reason: consultation.reason ?? null,
    diagnosis: consultation.diagnosis ?? null,
    treatment: consultation.treatment ?? null,
    notes: consultation.notes ?? null,
    weight_kg: consultation.weight_kg ?? null,
    temperature_celsius: consultation.temperature_celsius ?? null,
    attended_by: consultation.attended_by ?? null,
    pet: visit.pet,
    prescriptions: visit.prescriptions ?? [],
    attachments: visit.attachments ?? [],
    addendums: visit.addendums ?? [],
  }

  return NextResponse.json({ data })
}
