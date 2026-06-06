import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hospitalizationDailyLogSchema } from '@/lib/validations/hospitalization'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveTenantAndVisit(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, visitId: string) {
  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', userId).single()
  const tenantId = (profile as any)?.tenant_id
  if (!tenantId) return { tenantId: null, visit: null }

  const { data: visit } = await (supabase as any)
    .from('service_visits')
    .select('id')
    .eq('id', visitId)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'hospitalization')
    .maybeSingle()

  return { tenantId, visit }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { tenantId, visit } = await resolveTenantAndVisit(supabase, user.id, id)
  if (!tenantId) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })
  if (!visit) return NextResponse.json({ error: 'Estancia no encontrada' }, { status: 404 })

  const { data, error } = await (supabase as any)
    .from('hospitalization_daily_logs')
    .select('id, log_date, notes, medications, fed, temperature, created_at')
    .eq('visit_id', id)
    .order('log_date', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: 'Error al obtener la bitácora' }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { tenantId, visit } = await resolveTenantAndVisit(supabase, user.id, id)
  if (!tenantId) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })
  if (!visit) return NextResponse.json({ error: 'Estancia no encontrada' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = hospitalizationDailyLogSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase as any)
    .from('hospitalization_daily_logs')
    .upsert({
      visit_id: id,
      log_date: result.data.log_date ?? new Date().toISOString().split('T')[0],
      notes: result.data.notes ?? null,
      medications: result.data.medications ?? null,
      fed: result.data.fed ?? false,
      temperature: result.data.temperature ?? null,
      created_by: user.id,
    }, { onConflict: 'visit_id,log_date' })
    .select('id, log_date, notes, medications, fed, temperature, created_at')
    .single()
  if (error) return NextResponse.json({ error: 'Error al guardar la entrada' }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
