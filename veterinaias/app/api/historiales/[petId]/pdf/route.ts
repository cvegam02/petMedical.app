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
        sterilized, habitat, feeding, cohabitation, cohabitation_details,
        species:species_id(name),
        owner:pet_registrations!inner(owner:owner_id(full_name, phone))
      `)
      .eq('id', petId)
      .eq('pet_registrations.tenant_id', profile.tenant_id)
      .single(),
    (supabase as any)
      .from('service_visits')
      .select(`
        id, created_at,
        consultation:consultation_records(
          reason, diagnosis, treatment, notes,
          weight_kg, temperature_celsius,
          attended_by_profile:attended_by(full_name)
        ),
        prescriptions(id, medication_name, dosage, frequency, duration, notes),
        attachments(id, file_name, storage_path),
        addendums(id, content, created_at, created_by_profile:created_by(full_name))
      `)
      .eq('pet_id', petId)
      .eq('service_type', 'consultation')
      .order('created_at', { ascending: false }),
  ])

  if (!petRes.data) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  const pet = petRes.data as any
  const owner = pet.owner?.[0]?.owner ?? null

  // Flatten visit + consultation_records into the shape MedicalHistoryDocument expects
  const records = ((recordsRes.data ?? []) as any[]).map((visit: any) => {
    const c = visit.consultation ?? {}
    return {
      id: visit.id,
      created_at: visit.created_at,
      reason: c.reason ?? null,
      diagnosis: c.diagnosis ?? null,
      treatment: c.treatment ?? null,
      notes: c.notes ?? null,
      weight_kg: c.weight_kg ?? null,
      temperature_celsius: c.temperature_celsius ?? null,
      created_by_profile: c.attended_by_profile ?? null,
      prescriptions: visit.prescriptions ?? [],
      attachments: visit.attachments ?? [],
      addendums: visit.addendums ?? [],
    }
  })
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
  } catch {
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 })
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
