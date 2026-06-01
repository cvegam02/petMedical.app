import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

export default async function SharedRecordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: shared } = await (admin.from('shared_records') as any)
    .select('record_id, expires_at, tenants(name)')
    .eq('token', token)
    .single()

  if (!shared) notFound()

  if (new Date(shared.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <p className="text-lg font-semibold text-foreground">Link expirado</p>
          <p className="text-sm text-muted-foreground mt-1">Este enlace ya no está disponible.</p>
        </div>
      </div>
    )
  }

  const { data: visit } = await (admin as any)
    .from('service_visits')
    .select(`
      id, created_at,
      consultation:consultation_records!visit_id(
        reason, diagnosis, treatment, notes,
        weight_kg, temperature_celsius,
        attended_by_profile:attended_by(full_name)
      ),
      pet:pet_id(name, species:species_id(name), breed),
      prescriptions(id, medication_name, dosage, frequency, duration, notes)
    `)
    .eq('id', shared.record_id)
    .eq('service_type', 'consultation')
    .single()

  if (!visit) notFound()

  const consultation = (visit.consultation ?? {}) as any
  const record = {
    id: visit.id,
    created_at: visit.created_at,
    reason: consultation.reason ?? null,
    diagnosis: consultation.diagnosis ?? null,
    treatment: consultation.treatment ?? null,
    notes: consultation.notes ?? null,
    weight_kg: consultation.weight_kg ?? null,
    temperature_celsius: consultation.temperature_celsius ?? null,
    prescriptions: visit.prescriptions ?? [],
  }

  const pet = visit.pet as any
  const vet = consultation.attended_by_profile as any
  const tenantName = (shared.tenants as any)?.name ?? 'Clínica Veterinaria'
  const date = new Date(record.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8 pb-6 border-b border-border">
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">{tenantName}</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">Resumen de consulta</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pet?.name}
            {[pet?.species?.name, pet?.breed].filter(Boolean).length > 0 && ` · ${[pet?.species?.name, pet?.breed].filter(Boolean).join(' · ')}`}
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Fecha</p>
            <p className="text-sm text-foreground">{date}</p>
            {vet?.full_name && <p className="text-xs text-muted-foreground mt-0.5">Dr. {vet.full_name}</p>}
          </div>

          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Motivo</p>
            <p className="text-sm text-foreground">{record.reason}</p>
          </div>

          {record.diagnosis && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Diagnóstico</p>
              <p className="text-sm text-foreground">{record.diagnosis}</p>
            </div>
          )}

          {record.treatment && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Tratamiento</p>
              <p className="text-sm text-foreground">{record.treatment}</p>
            </div>
          )}

          {record.notes && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Notas</p>
              <p className="text-sm text-muted-foreground italic">{record.notes}</p>
            </div>
          )}

          {[record.weight_kg, record.temperature_celsius].some(v => v != null) && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Signos vitales</p>
              <div className="flex flex-wrap gap-2">
                {record.weight_kg != null && <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border">Peso: {record.weight_kg} kg</span>}
                {record.temperature_celsius != null && <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border">Temp: {record.temperature_celsius}°C</span>}
              </div>
            </div>
          )}

          {(record.prescriptions as any[]).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Medicamentos</p>
              <div className="space-y-2">
                {(record.prescriptions as any[]).map((p: any) => (
                  <div key={p.id} className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <p className="font-medium text-foreground">{p.medication_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[p.dosage, p.frequency, p.duration].filter(Boolean).join(' · ')}
                    </p>
                    {p.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{p.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 pt-5 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            {tenantName} · MundoPet<br />
            Enlace válido hasta el {new Date(shared.expires_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}
