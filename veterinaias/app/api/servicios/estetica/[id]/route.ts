import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const patchSchema = z.object({
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  notes: z.string().optional(),
  intake_notes: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenantId = (profile as any).tenant_id

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const result = patchSchema.safeParse(body)
  if (!result.success)
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  // Invariant: check if session is already concluded
  const { data: existing, error: fetchError } = await (supabase as any)
    .from('service_visits')
    .select('ended_at')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: 'Error al verificar sesión' }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  if (existing.ended_at) return NextResponse.json({ error: 'La sesión ya fue concluida' }, { status: 409 })

  const { notes, intake_notes, ...visitFields } = result.data

  if (visitFields.ended_at !== undefined) {
    // Concluir: cierre atómico de visita + notas + cita ligada (todo o nada).
    const { error: rpcError } = await (supabase as any).rpc('conclude_service_visit', {
      p_visit_id: id,
      p_ended_at: visitFields.ended_at,
      p_notes: notes ?? null,
      p_intake_notes: intake_notes ?? null,
    })
    if (rpcError) return NextResponse.json({ error: 'Error al concluir el servicio' }, { status: 500 })
  } else {
    // Editar sin concluir (started_at y/o notas).
    const visitUpdate: Record<string, unknown> = {}
    if (visitFields.started_at !== undefined) visitUpdate.started_at = visitFields.started_at
    if (Object.keys(visitUpdate).length > 0) {
      const { error: visitError } = await (supabase as any)
        .from('service_visits')
        .update(visitUpdate)
        .eq('id', id)
        .eq('tenant_id', tenantId)
      if (visitError) return NextResponse.json({ error: 'Error al actualizar sesión' }, { status: 500 })
    }

    const recordUpdate: Record<string, unknown> = {}
    if (notes !== undefined) recordUpdate.notes = notes
    if (intake_notes !== undefined) recordUpdate.intake_notes = intake_notes
    if (Object.keys(recordUpdate).length > 0) {
      const { error: recordError } = await (supabase as any)
        .from('grooming_records')
        .update(recordUpdate)
        .eq('visit_id', id)
      if (recordError) return NextResponse.json({ error: 'Error al actualizar notas' }, { status: 500 })
    }
  }

  // Return updated visit
  const { data, error } = await (supabase as any)
    .from('service_visits')
    .select(`
      id, started_at, ended_at, status, created_at, appointment_id,
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name))
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) return NextResponse.json({ error: 'Error al obtener sesión actualizada' }, { status: 500 })

  const record = Array.isArray(data.record) ? data.record[0] : data.record
  return NextResponse.json({
    data: {
      ...data,
      session_date: data.started_at ?? data.created_at,
      notes: record?.notes ?? null,
      intake_notes: record?.intake_notes ?? null,
      services: record?.services ?? [],
    },
  })
}
