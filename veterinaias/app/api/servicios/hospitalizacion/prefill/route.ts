import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenantId = (profile as any).tenant_id
  const url = new URL(req.url)
  const visitId = url.searchParams.get('visitId')
  const appointmentId = url.searchParams.get('appointmentId')

  if (!visitId && !appointmentId)
    return NextResponse.json({ error: 'Debe proveer visitId o appointmentId' }, { status: 400 })

  // Resolve the source service_visit
  let sourceVisit: any = null
  if (visitId) {
    const { data } = await (supabase as any)
      .from('service_visits')
      .select('id, service_type, pet_id, pet:pet_id(id, name, species:species_id(name))')
      .eq('id', visitId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    sourceVisit = data
  } else {
    const { data } = await (supabase as any)
      .from('service_visits')
      .select('id, service_type, pet_id, pet:pet_id(id, name, species:species_id(name))')
      .eq('appointment_id', appointmentId)
      .eq('tenant_id', tenantId)
      .in('service_type', ['consultation', 'surgery'])
      .maybeSingle()
    sourceVisit = data
  }

  if (!sourceVisit) return NextResponse.json({ error: 'Visita de origen no encontrada' }, { status: 404 })

  // Fetch diagnosis from the appropriate records table
  let diagnosis: string | null = null
  if (sourceVisit.service_type === 'surgery') {
    const { data: rec } = await (supabase as any)
      .from('surgery_records')
      .select('diagnosis')
      .eq('visit_id', sourceVisit.id)
      .maybeSingle()
    diagnosis = rec?.diagnosis ?? null
  } else if (sourceVisit.service_type === 'consultation') {
    const { data: rec } = await (supabase as any)
      .from('medical_records')
      .select('diagnosis')
      .eq('service_visit_id', sourceVisit.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    diagnosis = rec?.diagnosis ?? null
  }

  return NextResponse.json({
    data: {
      sourceVisitId: sourceVisit.id,
      serviceType: sourceVisit.service_type,
      pet: sourceVisit.pet ?? null,
      diagnosis,
    },
  })
}
