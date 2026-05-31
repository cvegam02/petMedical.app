import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const statusSchema = z
  .object({
    status: z.enum(['active', 'inactive', 'deceased']),
    date_of_death: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
      .optional()
      .nullable(),
  })
  .refine(
    (v) => v.status !== 'deceased' || !!v.date_of_death,
    { message: 'La fecha de fallecimiento es obligatoria', path: ['date_of_death'] },
  )
  .refine(
    (v) => !v.date_of_death || new Date(v.date_of_death + 'T12:00:00') <= new Date(),
    { message: 'La fecha de fallecimiento no puede ser futura', path: ['date_of_death'] },
  )

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  const tenantId = (profile as any)?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = statusSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { status, date_of_death } = result.data
  const update = {
    status,
    status_changed_at: new Date().toISOString(),
    date_of_death: status === 'deceased' ? date_of_death ?? null : null,
  }

  const { data, error } = await (supabase as any)
    .from('pet_registrations')
    .update(update)
    .eq('pet_id', id)
    .eq('tenant_id', tenantId)
    .select('status, date_of_death')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Error al actualizar el estado' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Mascota no encontrada en esta clínica' }, { status: 404 })

  return NextResponse.json({ data })
}
