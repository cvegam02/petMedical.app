import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { updateAppointmentSchema } from '@/lib/validations/appointment'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['cancelled', 'no_show'],
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await (supabase.from('appointments') as any)
    .select(`
      id, status, scheduled_at, duration_minutes, reason, notes, created_at,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone, email),
      assigned_to_profile:assigned_to(id, full_name),
      created_by_profile:created_by(id, full_name),
      medical_record:medical_record_id(id)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = updateAppointmentSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  if (result.data.status) {
    const { data: current, error: fetchError } = await (supabase.from('appointments') as any)
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !current) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

    const allowed = ALLOWED_TRANSITIONS[current.status as string] ?? []
    if (!allowed.includes(result.data.status)) {
      return NextResponse.json(
        { error: `No se puede pasar de '${current.status}' a '${result.data.status}'` },
        { status: 422 }
      )
    }
  }

  const { data, error } = await (supabase.from('appointments') as any)
    .update(result.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
