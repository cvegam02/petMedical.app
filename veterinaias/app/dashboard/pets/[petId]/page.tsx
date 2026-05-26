import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MedicalRecordCard } from '@/components/medical-records/MedicalRecordCard'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, Plus, Cpu } from 'lucide-react'

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }

function calcAge(dob: string) {
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 1) return 'Recién nacido'
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${years} año${years > 1 ? 's' : ''} y ${rem} mes${rem > 1 ? 'es' : ''}` : `${years} año${years > 1 ? 's' : ''}`
}

export default async function PetDetailPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: pet, error } = await (supabase.from('pets') as any)
    .select(`
      id, name, sex, date_of_birth, color, microchip, notes, created_at,
      owner:owner_id(id, full_name),
      species:species_id(name),
      breed:breed_id(name),
      medical_records(
        id, reason, diagnosis, weight_kg, created_at,
        created_by_profile:created_by(full_name),
        prescriptions(id),
        attachments(id),
        addendums(id)
      )
    `)
    .eq('id', petId)
    .order('created_at', { referencedTable: 'medical_records', ascending: false })
    .single()

  if (error || !pet) notFound()

  const owner = pet.owner as any
  const species = pet.species as any
  const breed = pet.breed as any
  const records = (pet.medical_records as any[]) ?? []
  const age = pet.date_of_birth ? calcAge(pet.date_of_birth) : null
  const speciesEmoji = species?.name?.toLowerCase() === 'felino' ? '🐱' : '🐾'

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        href={`/dashboard/owners/${owner?.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft size={14} />
        {owner?.full_name}
      </Link>

      {/* Pet header card */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Species avatar */}
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-2xl">
              {speciesEmoji}
            </div>

            {/* Pet details */}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">{pet.name}</h1>
                {age && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {age}
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground mt-1">
                {species?.name}{breed ? ` · ${breed.name}` : ''} · {SEX_LABELS[pet.sex] ?? pet.sex}
                {pet.color ? ` · ${pet.color}` : ''}
              </p>

              {pet.microchip && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground/70 mt-1.5 font-mono">
                  <Cpu size={11} className="text-muted-foreground/40" />
                  {pet.microchip}
                </p>
              )}

              {pet.notes && (
                <p className="text-sm text-muted-foreground mt-2 italic leading-relaxed">{pet.notes}</p>
              )}
            </div>
          </div>

          <Link
            href={`/dashboard/pets/${petId}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Clinical history section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-0.5">Historial clínico</p>
          <h2 className="text-base font-semibold text-foreground">
            Expedientes
            {records.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({records.length})</span>
            )}
          </h2>
        </div>
        <Link
          href={`/dashboard/pets/${petId}/records/new`}
          className={buttonVariants({ size: 'sm' })}
        >
          <Plus size={14} className="mr-1.5" />
          Nuevo expediente
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-border">
          <p className="font-medium text-foreground mb-1">Sin expedientes clínicos</p>
          <p className="text-sm text-muted-foreground">Agrega el primer registro de consulta.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record: any) => (
            <MedicalRecordCard key={record.id} record={record} petId={petId} />
          ))}
        </div>
      )}
    </div>
  )
}
