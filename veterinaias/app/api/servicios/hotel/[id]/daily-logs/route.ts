import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { boardingDailyLogSchema } from '@/lib/validations/boarding'

async function verifyTenantOwnership(supabase: any, visitId: string, userId: string) {
  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', userId).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) return null

  const { data: visit } = await supabase
    .from('service_visits')
    .select('id')
    .eq('id', visitId)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'boarding')
    .maybeSingle()
  return visit ? tenantId : null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tenantId = await verifyTenantOwnership(supabase, id, user.id)
  if (!tenantId) return NextResponse.json({ error: 'Estancia no encontrada' }, { status: 404 })

  const { data, error } = await (supabase as any)
    .from('boarding_daily_logs')
    .select('id, log_date, notes, fed, walked, created_at')
    .eq('visit_id', id)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Error al obtener la bitácora' }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tenantId = await verifyTenantOwnership(supabase, id, user.id)
  if (!tenantId) return NextResponse.json({ error: 'Estancia no encontrada' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = boardingDailyLogSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('boarding_daily_logs')
    .upsert({
      visit_id: id,
      log_date: result.data.log_date ?? new Date().toISOString().split('T')[0],
      notes: result.data.notes ?? null,
      fed: result.data.fed ?? false,
      walked: result.data.walked ?? false,
      created_by: user.id,
    }, { onConflict: 'visit_id,log_date' })
    .select('id, log_date, notes, fed, walked, created_at')
    .single()
  if (error) return NextResponse.json({ error: 'Error al guardar la entrada' }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
