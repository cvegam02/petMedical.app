import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const attachmentSchema = z.object({
  storage_path: z.string().min(1).max(500),
  file_name: z.string().min(1).max(255),
  file_type: z.string().min(1).max(100),
  visit_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const result = attachmentSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })

  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  // Verificar que la visita pertenece al tenant del usuario (defensa en profundidad sobre RLS)
  const { data: visit } = await (supabase as any)
    .from('service_visits')
    .select('id')
    .eq('id', result.data.visit_id)
    .eq('tenant_id', (profile as any).tenant_id)
    .single()
  if (!visit) return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 })

  const { data, error } = await supabase
    .from('attachments')
    .insert({ ...result.data, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
