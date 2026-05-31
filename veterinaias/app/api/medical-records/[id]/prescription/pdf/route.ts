import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { PrescriptionDocument, type PrescriptionData } from '@/lib/pdf/prescriptionDocument'

export const runtime = 'nodejs'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function calcAge(dob: string | null): string | null {
  if (!dob) return null
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 1) return 'Recién nacido'
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.floor(months / 12)
  return `${years} año${years > 1 ? 's' : ''}`
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(name, settings)')
    .eq('id', user.id)
    .single() as any
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const { data: record } = await (supabase.from('medical_records') as any)
    .select(`
      id, diagnosis, treatment, weight_kg, created_at, tenant_id,
      pet:pet_id(id, name, sex, date_of_birth, breed, species:species_id(name)),
      vet:created_by(full_name, professional_license, professional_address),
      prescriptions(medication_name, active_ingredient, dosage, route_of_administration, frequency, duration, notes)
    `)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!record) return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 })

  const prescriptions = (record.prescriptions ?? []) as any[]
  if (prescriptions.length === 0) {
    return NextResponse.json({ error: 'El expediente no tiene recetas' }, { status: 400 })
  }

  if (!record.pet?.id) {
    return NextResponse.json({ error: 'Expediente sin mascota asociada' }, { status: 400 })
  }

  const { data: reg } = await (supabase as any)
    .from('pet_registrations')
    .select('owner:owner_id(full_name, address)')
    .eq('pet_id', record.pet?.id)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()
  const owner = reg?.owner ?? { full_name: '—', address: null }

  const tenant = profile.tenants as any
  const settings = tenant?.settings ?? {}
  const pet = record.pet as any
  const vet = record.vet as any

  const emittedAt = new Date(record.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const data: PrescriptionData = {
    clinic: { name: tenant?.name ?? 'Clínica Veterinaria', address: settings.address ?? null, phone: settings.phone ?? null, logoUrl: settings.logo_url ?? null },
    vet: { full_name: vet?.full_name ?? '—', professional_license: vet?.professional_license ?? null, professional_address: vet?.professional_address ?? null },
    patient: { name: pet?.name ?? '—', species: pet?.species?.name ?? null, breed: pet?.breed ?? null, sex: pet?.sex ?? 'unknown', age: calcAge(pet?.date_of_birth ?? null), weight: record.weight_kg ?? null },
    owner: { full_name: owner.full_name ?? '—', address: owner.address ?? null },
    record: { diagnosis: record.diagnosis ?? null, treatment: record.treatment ?? null, emittedAt },
    prescriptions: prescriptions.map(p => ({
      medication_name: p.medication_name,
      active_ingredient: p.active_ingredient ?? null,
      dosage: p.dosage,
      route_of_administration: p.route_of_administration ?? null,
      frequency: p.frequency,
      duration: p.duration,
      notes: p.notes ?? null,
    })),
    footerNote: settings.prescription_footer_note ?? null,
    validityDays: settings.prescription_validity_days ?? null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let buffer: any
  try {
    buffer = await (renderToBuffer as any)(createElement(PrescriptionDocument, data))
  } catch {
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 })
  }

  const safeName = (pet?.name ?? 'receta')
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-{2,}/g, '-')
  const dateStr = new Date().toISOString().split('T')[0]

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receta-${safeName}-${dateStr}.pdf"`,
    },
  })
}
