import { PawPrint, User, Calendar, AlertCircle } from 'lucide-react'

interface PetBannerProps {
  name: string
  species?: string | null
  breed?: string | null
  sex?: string | null
  dateOfBirth?: string | null
  notes?: string | null
  ownerName?: string | null
}

const SEX_LABELS: Record<string, string> = {
  male: 'Macho',
  female: 'Hembra',
  unknown: 'Desconocido',
}

function calcAge(dob: string): string {
  const birth = new Date(dob + 'T12:00:00')
  const now = new Date()
  const totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years >= 1) return years === 1 ? '1 año' : `${years} años`
  if (months > 0) return months === 1 ? '1 mes' : `${months} meses`
  return 'Recién nacido'
}

export function PetBanner({ name, species, breed, sex, dateOfBirth, notes, ownerName }: PetBannerProps) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
          <PawPrint size={20} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + sex */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-foreground leading-none">{name}</h2>
            {sex && sex !== 'unknown' && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {SEX_LABELS[sex]}
              </span>
            )}
          </div>

          {/* Meta chips */}
          {(species || breed || dateOfBirth) && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {(species || breed) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground font-medium">
                  {[species, breed].filter(Boolean).join(' · ')}
                </span>
              )}
              {dateOfBirth && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground font-medium">
                  <Calendar size={11} />
                  {calcAge(dateOfBirth)}
                </span>
              )}
            </div>
          )}

          {/* Owner — separated row */}
          {ownerName && (
            <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border/60">
              <User size={12} className="text-muted-foreground/50 shrink-0" />
              <span className="text-xs text-muted-foreground">{ownerName}</span>
            </div>
          )}

          {/* Notes */}
          {notes && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm">
              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-800 leading-snug">{notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
