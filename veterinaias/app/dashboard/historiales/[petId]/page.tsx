import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Cat, Dog, PawPrint, CalendarDays, Cpu, User, Venus, Mars, HelpCircle, Stethoscope } from 'lucide-react'
import { MedicalTimeline } from '@/components/historiales/MedicalTimeline'
import { PdfDownloadButton } from '@/components/historiales/PdfDownloadButton'

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }
const SEX_ICONS: Record<string, typeof Mars> = { male: Mars, female: Venus, unknown: HelpCircle }

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
        sterilized, habitat, feeding, cohabitation, cohabitation_details,
        species:species_id(name),
        owner:pet_registrations!inner(owner:owner_id(full_name, phone, email))
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
        const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44))
        if (months < 1) return 'Recién nacido'
        if (years < 1) return `${months} ${months === 1 ? 'mes' : 'meses'}`
        return `${years} año${years !== 1 ? 's' : ''}`
      })()
    : null

  const speciesName = pet.species?.name?.toLowerCase() || ''
  const Icon = speciesName.includes('fel') || speciesName.includes('gat') ? Cat
    : speciesName.includes('can') || speciesName.includes('perr') ? Dog
    : PawPrint
  const SexIcon = SEX_ICONS[pet.sex] ?? HelpCircle

  const lastVisit = records[0]?.created_at
    ? new Date(records[0].created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  const hasLifestyle = pet.sterilized != null || pet.habitat || pet.feeding || (pet.cohabitation && pet.cohabitation_details)

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
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center text-muted-foreground/50 shrink-0">
            <Icon size={26} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Paciente</p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{pet.name}</h1>
              {pet.species?.name && (
                <span className="label-overline text-muted-foreground/50 border border-border px-2 py-0.5 rounded bg-muted/50">{pet.species.name}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
              <span>{pet.breed || 'Raza no definida'}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1">
                <SexIcon size={12} className="text-muted-foreground/50" />
                {SEX_LABELS[pet.sex] ?? pet.sex}
              </span>
              {pet.color && (<><span className="text-muted-foreground/40">·</span><span>{pet.color}</span></>)}
            </p>
          </div>
          <PdfDownloadButton petId={petId} />
        </div>

        {/* Data grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 mt-6 pt-5 border-t border-border/60 divide-x divide-border/60">
          <div className="px-4 first:pl-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={11} className="text-muted-foreground/40" />
              <p className="label-overline text-muted-foreground/50">Edad</p>
            </div>
            <p className="text-sm font-semibold text-foreground">{ageStr || '—'}</p>
          </div>
          <div className="px-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Cpu size={11} className="text-muted-foreground/40" />
              <p className="label-overline text-muted-foreground/50">Microchip</p>
            </div>
            <p className="text-sm font-mono font-bold text-foreground truncate">{pet.microchip || '—'}</p>
          </div>
          <div className="px-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <User size={11} className="text-muted-foreground/40" />
              <p className="label-overline text-muted-foreground/50">Responsable</p>
            </div>
            <p className="text-sm font-medium text-foreground truncate">{owner?.full_name ?? '—'}</p>
          </div>
          <div className="px-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Stethoscope size={11} className="text-muted-foreground/40" />
              <p className="label-overline text-muted-foreground/50">Consultas</p>
            </div>
            <p className="text-sm font-semibold text-foreground">{records.length}</p>
          </div>
          <div className="px-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={11} className="text-muted-foreground/40" />
              <p className="label-overline text-muted-foreground/50">Última visita</p>
            </div>
            <p className="text-sm font-semibold text-foreground">{lastVisit || '—'}</p>
          </div>
        </div>

        {/* Información de vida */}
        {hasLifestyle && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="label-overline text-muted-foreground/50 mb-2">Información de vida</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              {pet.habitat && <p><span className="text-muted-foreground">Dónde vive: </span>{pet.habitat}</p>}
              {pet.feeding && <p><span className="text-muted-foreground">Alimentación: </span>{pet.feeding}</p>}
              {pet.sterilized != null && (
                <p><span className="text-muted-foreground">Esterilizado: </span>{pet.sterilized ? 'Sí' : 'No'}</p>
              )}
              {pet.cohabitation && pet.cohabitation_details && (
                <p className="col-span-2"><span className="text-muted-foreground">Convive con: </span>{pet.cohabitation_details}</p>
              )}
            </div>
          </div>
        )}

        {/* Contacto del dueño */}
        {owner && (owner.phone || owner.email) && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="label-overline text-muted-foreground/50 mb-1.5">Contacto del dueño</p>
            <p className="text-sm text-muted-foreground">
              {[owner.phone, owner.email].filter(Boolean).join(' · ')}
            </p>
          </div>
        )}
      </div>

      <MedicalTimeline records={records} />
    </div>
  )
}
