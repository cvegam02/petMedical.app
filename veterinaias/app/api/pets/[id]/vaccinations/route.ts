import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const createVaccinationSchema = z.object({
  vaccine_catalog_id: z.string().uuid().optional(),
  vaccine_name: z.string().min(1, 'Nombre de vacuna es requerido'),
  lot_number: z.string().optional(),
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  next_due_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.string().optional(),
  medical_record_id: z.string().uuid().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data, error } = await (supabase as any)
    .from('pet_vaccinations')
    .select('*, applied_by_profile:applied_by(full_name), tenant:tenant_id(name)')
    .eq('pet_id', id)
    .order('application_date', { ascending: false })

  if (error) return NextResponse.json({ error: 'Error al obtener vacunaciones' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  // Verify pet exists
  const { data: pet } = await (supabase as any).from('pets').select('id').eq('id', id).maybeSingle()
  if (!pet) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })
  const tenantId = (profile as any).tenant_id as string

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = createVaccinationSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { vaccine_catalog_id, ...rest } = result.data

  const { data, error } = await (supabase as any)
    .from('pet_vaccinations')
    .insert({
      ...rest,
      pet_id: id,
      tenant_id: tenantId,
      applied_by: user.id,
      ...(vaccine_catalog_id ? { vaccine_catalog_id } : {}),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al registrar vacunación' }, { status: 500 })

  // Decrementar stock si viene del catálogo
  if (vaccine_catalog_id) {
    const { data: vaccine } = await (supabase as any)
      .from('vaccine_catalog')
      .select('stock_quantity')
      .eq('id', vaccine_catalog_id)
      .eq('tenant_id', tenantId)
      .single()

    if (vaccine && vaccine.stock_quantity > 0) {
      await (supabase as any)
        .from('vaccine_catalog')
        .update({ stock_quantity: vaccine.stock_quantity - 1 })
        .eq('id', vaccine_catalog_id)
        .eq('tenant_id', tenantId)
        .gt('stock_quantity', 0)
    }
  }

  return NextResponse.json({ data }, { status: 201 })
}
