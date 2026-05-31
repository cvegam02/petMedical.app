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
    .from('grooming_sessions')
    .select(`
      id, session_date, notes, created_at,
      services:grooming_session_services(id, service_name),
      tenant:tenant_id(name)
    `)
    .eq('pet_id', petId)
    .eq('tenant_id', (profile as any).tenant_id)
    .order('session_date', { ascending: false })

  if (error)
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
  return NextResponse.json({ data })
}
