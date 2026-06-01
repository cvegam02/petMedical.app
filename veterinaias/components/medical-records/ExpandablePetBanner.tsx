'use client'
import { useState, useEffect } from 'react'
import { X, Calendar } from 'lucide-react'
import { PetBanner } from './PetBanner'
import { MedicalRecordDetailModal } from './MedicalRecordDetailModal'

interface ExpandablePetBannerProps {
  petId: string
  name: string
  species?: string | null
  breed?: string | null
  ownerName?: string | null
  sex?: string | null
  dateOfBirth?: string | null
  notes?: string | null
  onClear?: () => void // Optional, only shown in WalkInConsultationPage
}

const SEX_LABELS: Record<string, string> = {
  male: 'Macho',
  female: 'Hembra',
  unknown: 'Desconocido',
}

export function ExpandablePetBanner({
  petId,
  name,
  species,
  breed,
  ownerName,
  sex: initialSex,
  dateOfBirth: initialDateOfBirth,
  notes: initialNotes,
  onClear,
}: ExpandablePetBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [petDetails, setPetDetails] = useState<any | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null)
  const [visitModalOpen, setVisitModalOpen] = useState(false)

  useEffect(() => {
    // Reset states if pet changes
    setPetDetails(null)
    setIsExpanded(false)
  }, [petId])

  useEffect(() => {
    if (!isExpanded || petDetails) return

    async function fetchPetDetails() {
      setLoadingDetails(true)
      try {
        const res = await fetch(`/api/pets/${petId}`)
        const json = await res.json()
        if (res.ok && json.data) {
          setPetDetails(json.data)
        }
      } catch (err) {
        console.error('Error fetching pet details:', err)
      } finally {
        setLoadingDetails(false)
      }
    }

    fetchPetDetails()
  }, [isExpanded, petId, petDetails])

  // Enhance initial values with loaded details if available
  const displaySex = petDetails?.sex ?? initialSex
  const displayDateOfBirth = petDetails?.date_of_birth ?? initialDateOfBirth
  const displayNotes = petDetails?.notes ?? initialNotes

  return (
    <div className="mb-5">
      <PetBanner
        name={name}
        species={species}
        breed={breed}
        ownerName={ownerName}
        sex={displaySex}
        dateOfBirth={displayDateOfBirth}
        notes={displayNotes}
      />

      <div className="mt-2.5 flex items-center justify-between gap-4 flex-wrap">
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={12} />
            Cambiar mascota
          </button>
        ) : (
          <span /> // spacer to keep align right if no clear button
        )}

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-85 transition-opacity cursor-pointer"
        >
          {isExpanded ? (
            <>Ver menos detalles ↑</>
          ) : (
            <>Ver más detalles (historial) ↓</>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 bg-muted/15 border border-border/60 rounded-xl p-5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
          {loadingDetails ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <p className="text-[11px] text-muted-foreground font-medium">Cargando información adicional...</p>
            </div>
          ) : !petDetails ? (
            <p className="text-xs text-muted-foreground text-center py-2">No se pudo cargar la información del paciente.</p>
          ) : (
            <div className="space-y-4">
              {/* Lifestyle Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-xs bg-card p-3 rounded-lg border border-border/40">
                  <p className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">Estilo de vida</p>
                  <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                    <span className="text-muted-foreground">Hábitat</span>
                    <span className="font-semibold text-foreground">{petDetails.habitat ?? '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                    <span className="text-muted-foreground">Alimentación</span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]">{petDetails.feeding ?? '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                    <span className="text-muted-foreground">Esterilizado</span>
                    <span className={`font-semibold ${petDetails.sterilized ? 'text-green-600' : 'text-amber-600'}`}>
                      {petDetails.sterilized === true ? 'Sí' : petDetails.sterilized === false ? 'No' : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-start py-0.5">
                    <span className="text-muted-foreground">Convivencia</span>
                    <span className="font-semibold text-foreground text-right max-w-[150px] break-words">
                      {petDetails.cohabitation ? petDetails.cohabitation_details || 'Sí' : 'No'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs bg-card p-3 rounded-lg border border-border/40">
                  <p className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">Datos adicionales</p>
                  <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                    <span className="text-muted-foreground">Color</span>
                    <span className="font-semibold text-foreground">{petDetails.color ?? '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                    <span className="text-muted-foreground">Microchip</span>
                    <span className="font-semibold text-foreground">{petDetails.microchip ?? '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                    <span className="text-muted-foreground">Sexo</span>
                    <span className="font-semibold text-foreground">{SEX_LABELS[petDetails.sex] ?? petDetails.sex}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-muted-foreground">Fecha Nacimiento</span>
                    <span className="font-semibold text-foreground">{petDetails.date_of_birth ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* Last 2 visits */}
              <div className="space-y-2.5 pt-2 border-t border-border/40">
                <p className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-wider">Últimas 2 visitas</p>
                {(() => {
                  const visits = ((petDetails.service_visits ?? []) as any[]).map((v: any) => ({
                    ...v,
                    ...(v.consultation ?? {}),
                    created_by_profile: v.consultation?.attended_by_profile ?? null,
                  }))
                  return visits.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visits.slice(0, 2).map((visit: any, idx: number) => {
                      const visitDate = new Date(visit.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })
                      return (
                        <button
                          key={visit.id}
                          type="button"
                          onClick={() => {
                            setSelectedVisit(visit)
                            setVisitModalOpen(true)
                          }}
                          className="w-full text-left bg-card hover:bg-muted/40 border border-border/40 hover:border-primary/20 rounded-xl p-3.5 flex flex-col gap-1.5 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                              Visita {idx === 0 ? 'Reciente' : 'Anterior'}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">{visitDate}</span>
                          </div>
                          <h5 className="text-xs font-bold text-foreground truncate leading-tight mt-1">
                            {visit.reason}
                          </h5>
                          {visit.diagnosis && (
                            <p className="text-[11px] text-muted-foreground/80 line-clamp-1">
                              Dx: {visit.diagnosis}
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-1 pl-1">
                    No hay visitas anteriores registradas para esta mascota.
                  </p>
                )
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      <MedicalRecordDetailModal
        record={selectedVisit}
        open={visitModalOpen}
        onOpenChange={setVisitModalOpen}
      />
    </div>
  )
}
