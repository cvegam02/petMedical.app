import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { PrescriptionDocument, type PrescriptionData } from '@/lib/pdf/prescriptionDocument'

// Datos de muestra para la vista previa de la receta en Settings
const DUMMY = {
  vet: {
    full_name: 'Ana López García',
    professional_license: '12345678',
    professional_address: 'Av. Reforma 123, Col. Centro, Ciudad de México',
  },
  patient: {
    name: 'Firulais',
    species: 'Perro',
    breed: 'Labrador',
    sex: 'male',
    age: '3 años',
    weight: 28.5,
  },
  owner: {
    full_name: 'Juan Pérez Hernández',
    address: 'Calle Pino 45, Col. Jardines del Sur',
  },
  prescriptions: [
    {
      medication_name: 'Amoxicilina',
      active_ingredient: 'Amoxicilina trihidratada',
      dosage: '250 mg',
      route_of_administration: 'Oral',
      frequency: 'Cada 12 horas',
      duration: '7 días',
      notes: 'Administrar con alimento.',
    },
    {
      medication_name: 'Otomax',
      active_ingredient: 'Gentamicina + betametasona',
      dosage: '4 gotas',
      route_of_administration: 'Ótica',
      frequency: 'Cada 24 horas',
      duration: '7 días',
      notes: null,
    },
  ] satisfies PrescriptionData['prescriptions'],
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(name, settings)')
    .eq('id', user.id)
    .single() as any
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenant = profile.tenants as any
  const settings = tenant?.settings ?? {}

  // Pie y vigencia: usar query params (edición en vivo) o caer en lo guardado
  const params = req.nextUrl.searchParams
  const footerNote = params.has('footer')
    ? (params.get('footer')!.trim() || null)
    : (settings.prescription_footer_note ?? null)
  const validityRaw = params.has('validity') ? params.get('validity')! : null
  const validityDays = validityRaw !== null
    ? (validityRaw.trim() === '' ? null : Number(validityRaw))
    : (settings.prescription_validity_days ?? null)

  const emittedAt = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const data: PrescriptionData = {
    clinic: {
      name: tenant?.name ?? 'Clínica Veterinaria',
      address: settings.address ?? null,
      phone: settings.phone ?? null,
      logoUrl: settings.logo_url ?? null,
    },
    vet: DUMMY.vet,
    patient: DUMMY.patient,
    owner: DUMMY.owner,
    record: {
      diagnosis: 'Otitis externa bacteriana en oído derecho.',
      treatment: 'Limpieza ótica y antibiótico tópico durante 7 días.',
      emittedAt,
    },
    prescriptions: DUMMY.prescriptions,
    footerNote,
    validityDays: validityDays != null && Number.isNaN(validityDays) ? null : validityDays,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let buffer: any
  try {
    buffer = await (renderToBuffer as any)(createElement(PrescriptionDocument, data))
  } catch {
    return NextResponse.json({ error: 'Error al generar la vista previa' }, { status: 500 })
  }

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="vista-previa-receta.pdf"',
    },
  })
}
