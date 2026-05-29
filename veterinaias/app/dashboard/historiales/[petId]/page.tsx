import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MedicalTimeline } from '@/components/historiales/MedicalTimeline'
import { PdfDownloadButton } from '@/components/historiales/PdfDownloadButton'

export default async function PetHistorialPage({
  params,
}: {
  params: Promise<{ petId: string }>
}) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) notFound()

  // Verify pet belongs to tenant
  const { data: reg } = await (supabase.from('pet_registrations') as any)
    .select('pet_id')
    .eq('pet_id', petId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!reg) notFound()

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

  if (!petRes.data) notFound()

  const pet = petRes.data as any
  const records = (recordsRes.data ?? []) as any[]
  const owner = pet.owner?.[0]?.owner ?? null

  const ageStr = pet.date_of_birth
    ? (() => {
        const diff = Date.now() - new Date(pet.date_of_birth).getTime()
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
        return years > 0 ? `${years} año${years !== 1 ? 's' : ''}` : '< 1 año'
      })()
    : null

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/historiales"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Historiales
      </Link>

      {/* Patient header */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em] mb-1">Paciente</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{pet.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {[pet.species?.name, pet.breed, ageStr, pet.microchip ? `Microchip: ${pet.microchip}` : null]
                .filter(Boolean).join(' · ')}
            </p>
            {owner && (
              <p className="text-sm text-muted-foreground mt-1">
                Dueño: {owner.full_name}{owner.phone ? ` · ${owner.phone}` : ''}
              </p>
            )}
          </div>
          <PdfDownloadButton petId={petId} />
        </div>
      </div>

      <MedicalTimeline records={records} />
    </div>
  )
}
