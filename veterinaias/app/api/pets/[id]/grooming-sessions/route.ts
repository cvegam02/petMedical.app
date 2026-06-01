import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: petId } = await params
  if (!UUID_REGEX.test(petId))
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { data, error } = await (supabase as any)
    .from('service_visits')
    .select(`
      id, started_at, ended_at, status, created_at,
      record:grooming_records(notes),
      services:grooming_record_services(id, service_name),
      tenant:tenant_id(name)
    `)
    .eq('pet_id', petId)
    .eq('tenant_id', (profile as any).tenant_id)
    .eq('service_type', 'grooming')
    .order('created_at', { ascending: false })

  if (error)
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })

  const mapped = (data ?? []).map((row: any) => {
    const record = Array.isArray(row.record) ? row.record[0] : row.record
    return {
      ...row,
      session_date: row.started_at ?? row.created_at,
      notes: record?.notes ?? null,
    }
  })

  return NextResponse.json({ data: mapped })
}
