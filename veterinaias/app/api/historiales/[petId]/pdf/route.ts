import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { MedicalHistoryDocument } from '@/lib/pdf/medicalHistoryDocument'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ petId: string }> },
) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(name, settings)')
    .eq('id', user.id)
    .single() as any

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  // Verify pet belongs to tenant
  const { data: reg } = await (supabase.from('pet_registrations') as any)
    .select('pet_id')
    .eq('pet_id', petId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!reg) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  const [petRes, recordsRes] = await Promise.all([
    (supabase.from('pets') as any)
      .select(`
        id, name, sex, date_of_birth, breed, microchip, color,
        species:species_id(name),
        owner:pet_registrations!inner(owner:owner_id(full_name, phone))
      `)
      .eq('id', petId)
      .eq('pet_registrations.tenant_id', profile.tenant_id)
      .single(),
    (supabase.from('medical_records') as any)
      .select(`
        id, reason, diagnosis, treatment, notes, created_at,
        weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm,
        created_by_profile:created_by(full_name),
        prescriptions(id, medication_name, dosage, frequency, duration, notes),
        attachments(id, file_name, storage_path),
        addendums(id, content, created_at, created_by_profile:created_by(full_name))
      `)
      .eq('pet_id', petId)
      .order('created_at', { ascending: false }),
  ])

  if (!petRes.data) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  const pet = petRes.data as any
  const owner = pet.owner?.[0]?.owner ?? null
  const records = (recordsRes.data ?? []) as any[]
  const tenant = profile.tenants as any
  const generatedAt = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let buffer: any
  try {
    buffer = await (renderToBuffer as any)(
      createElement(MedicalHistoryDocument, {
        pet,
        owner,
        records,
        tenantName: tenant?.name ?? 'Clínica Veterinaria',
        tenantLogoUrl: tenant?.settings?.logo_url ?? null,
        generatedAt,
      })
    )
  } catch (err) {
    return NextResponse.json({ error: 'Error al generar el PDF', detail: (err as Error)?.message ?? String(err) }, { status: 500 })
  }

  const safeName = (pet.name as string)
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-{2,}/g, '-')
  const dateStr = new Date().toISOString().split('T')[0]

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="historial-${safeName}-${dateStr}.pdf"`,
    },
  })
}
