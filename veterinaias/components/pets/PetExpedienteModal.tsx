'use client'
import * as React from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  PawPrint,
  User,
  Clock,
  HeartPulse,
  Activity,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  Heart,
  Droplet,
  Shield,
  Apple,
  MapPin,
  Users,
  Stethoscope,
  ChevronRight,
  BookOpen
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface PetExpedienteModalProps {
  petId: string
  petName: string
  trigger: React.ReactNode
}

interface PetData {
  id: string
  name: string
  sex: 'male' | 'female' | 'unknown'
  date_of_birth: string | null
  color: string | null
  microchip: string | null
  notes: string | null
  sterilized: boolean | null
  habitat: string | null
  feeding: string | null
  cohabitation: boolean | null
  cohabitation_details: string | null
  species: { id: string; name: string } | null
  breed: string | null
  owner: {
    id: string
    full_name: string
    email: string | null
    phone: string
  } | null
  service_visits: Array<{
    id: string
    created_at: string
    consultation: {
      reason: string
      diagnosis: string | null
      treatment: string | null
      notes: string | null
      weight_kg: number | null
      temperature_celsius: number | null
      attended_by_profile: { full_name: string } | null
    } | null
    prescriptions: Array<{
      id: string
      medication_name: string
      dosage: string
      frequency: string
      duration: string
      notes: string | null
    }>
  }>
}

const SEX_LABELS: Record<string, string> = {
  male: 'Macho',
  female: 'Hembra',
  unknown: 'Desconocido',
}

function calcAge(dob: string) {
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 12) return `${months}m`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${years}a ${rem}m` : `${years}a`
}

export function PetExpedienteModal({ petId, petName, trigger }: PetExpedienteModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pet, setPet] = useState<PetData | null>(null)

  useEffect(() => {
    if (!open) return

    async function fetchPetData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/pets/${petId}`)
        const json = await res.json()
        if (res.ok && json.data) {
          setPet(json.data)
        }
      } catch (err) {
        console.error('Error fetching pet details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPetData()
  }, [open, petId])

  const age = pet?.date_of_birth ? calcAge(pet.date_of_birth) : null
  const lastVisit = pet?.service_visits?.[0] ?? null
  const lastRecord = lastVisit
    ? {
        ...lastVisit,
        reason: lastVisit.consultation?.reason ?? '',
        diagnosis: lastVisit.consultation?.diagnosis ?? null,
        treatment: lastVisit.consultation?.treatment ?? null,
        notes: lastVisit.consultation?.notes ?? null,
        weight_kg: lastVisit.consultation?.weight_kg ?? null,
        temperature_celsius: lastVisit.consultation?.temperature_celsius ?? null,
        created_by_profile: lastVisit.consultation?.attended_by_profile ?? null,
      }
    : null

  const triggerElement = React.isValidElement(trigger)
    ? React.cloneElement(trigger as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent) => {
          e.preventDefault()
          setOpen(true)
          if ((trigger.props as any)?.onClick) {
            (trigger.props as any).onClick(e)
          }
        }
      })
    : <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>

  return (
    <>
      {triggerElement}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 border-border/80 shadow-2xl">
          <DialogHeader className="p-6 bg-muted/20 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <PawPrint size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  Expediente de {petName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Resumen clínico rápido y datos de contacto del paciente
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">Cargando expediente clínico...</p>
            </div>
          ) : !pet ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <p className="text-sm font-semibold text-foreground">No se pudo cargar la información</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Hubo un error de conexión o el paciente no existe. Por favor, intenta de nuevo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {/* Paciente & Responsable Section */}
              <div className="p-6 space-y-5">
                <div>
                  <h3 className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
                    <Heart size={11} className="text-primary/70" /> Datos del Paciente
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/10 p-4 rounded-xl border border-border/40">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Especie / Raza</p>
                      <p className="text-xs font-semibold text-foreground truncate">
                        {pet.species?.name ?? '—'} {pet.breed ? `· ${pet.breed}` : ''}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Sexo</p>
                      <p className="text-xs font-semibold text-foreground">
                        {SEX_LABELS[pet.sex] ?? pet.sex}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Edad</p>
                      <p className="text-xs font-semibold text-foreground">
                        {age ? `${age} (${pet.date_of_birth})` : '—'}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Color / Microchip</p>
                      <p className="text-xs font-semibold text-foreground truncate">
                        {pet.color ?? '—'} {pet.microchip ? `· [${pet.microchip}]` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Estilo de Vida & Datos Médicos Básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 p-4 rounded-xl border border-border/40 bg-muted/5">
                    <h4 className="text-[10px] font-mono font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={11} className="text-primary/60" /> Estilo de vida
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                        <span className="text-muted-foreground flex items-center gap-1"><MapPin size={12} className="text-muted-foreground/60" /> Hábitat</span>
                        <span className="font-semibold text-foreground">{pet.habitat ?? '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                        <span className="text-muted-foreground flex items-center gap-1"><Apple size={12} className="text-muted-foreground/60" /> Alimentación</span>
                        <span className="font-semibold text-foreground truncate max-w-[150px]">{pet.feeding ?? '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                        <span className="text-muted-foreground flex items-center gap-1"><Shield size={12} className="text-muted-foreground/60" /> Esterilizado</span>
                        <span className={`font-semibold ${pet.sterilized ? 'text-green-600' : 'text-amber-600'}`}>
                          {pet.sterilized === true ? 'Sí' : pet.sterilized === false ? 'No' : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-start py-0.5">
                        <span className="text-muted-foreground flex items-center gap-1"><Users size={12} className="text-muted-foreground/60" /> Convivencia</span>
                        <span className="font-semibold text-foreground text-right max-w-[180px] break-words">
                          {pet.cohabitation ? pet.cohabitation_details || 'Sí, con otras mascotas' : 'No convive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-xl border border-border/40 bg-muted/5">
                    <h4 className="text-[10px] font-mono font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={11} className="text-primary/60" /> Propietario / Responsable
                    </h4>
                    {pet.owner ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                          <span className="text-muted-foreground">Nombre</span>
                          <span className="font-semibold text-foreground">{pet.owner.full_name}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                          <span className="text-muted-foreground">Teléfono</span>
                          <span className="font-semibold text-foreground">{pet.owner.phone}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-muted-foreground">Email</span>
                          <span className="font-semibold text-foreground truncate max-w-[180px]">{pet.owner.email ?? '—'}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-2">No hay propietario registrado para este paciente.</p>
                    )}
                  </div>
                </div>

                {pet.notes && (
                  <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-xs">
                    <span className="font-bold text-amber-700/80 uppercase text-[9px] tracking-wider block mb-1">Notas especiales</span>
                    <p className="text-amber-900/90 leading-relaxed italic">"{pet.notes}"</p>
                  </div>
                )}
              </div>

              {/* Ultima Consulta Section */}
              <div className="p-6">
                <h3 className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.15em] mb-4 flex items-center gap-1.5">
                  <Stethoscope size={11} className="text-primary/70" /> Última Visita Médica
                </h3>

                {lastRecord ? (
                  <div className="space-y-4 bg-muted/5 p-5 rounded-xl border border-border/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/20 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground leading-tight">
                          {lastRecord.reason}
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Calendar size={10} />
                          {new Date(lastRecord.created_at).toLocaleDateString('es-MX', {
                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                          {lastRecord.created_by_profile?.full_name && (
                            <>
                              <span>·</span>
                              <span>Dr. {lastRecord.created_by_profile.full_name}</span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Vital signs badge row */}
                      {(lastRecord.weight_kg || lastRecord.temperature_celsius) && (
                        <div className="flex items-center gap-2 shrink-0">
                          {lastRecord.weight_kg && (
                            <span className="text-[10px] font-mono font-bold bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded-full">
                              {lastRecord.weight_kg} kg
                            </span>
                          )}
                          {lastRecord.temperature_celsius && (
                            <span className="text-[10px] font-mono font-bold bg-rose-500/5 text-rose-600 border border-rose-500/10 px-2 py-0.5 rounded-full">
                              {lastRecord.temperature_celsius} °C
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {lastRecord.diagnosis && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest block">Diagnóstico</span>
                          <p className="text-foreground leading-relaxed font-medium">{lastRecord.diagnosis}</p>
                        </div>
                      )}
                      {lastRecord.treatment && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest block">Tratamiento</span>
                          <p className="text-foreground leading-relaxed">{lastRecord.treatment}</p>
                        </div>
                      )}
                    </div>

                    {/* Recetas */}
                    {lastRecord.prescriptions && lastRecord.prescriptions.length > 0 && (
                      <div className="border-t border-border/20 pt-3 space-y-2">
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest block">Medicamentos indicados</span>
                        <div className="grid grid-cols-1 gap-2">
                          {lastRecord.prescriptions.map((p) => (
                            <div key={p.id} className="bg-card rounded-lg p-2.5 text-xs border border-border/50 flex flex-col gap-0.5">
                              <span className="font-semibold text-foreground">{p.medication_name} — {p.dosage}</span>
                              <span className="text-muted-foreground text-[11px]">{p.frequency} por {p.duration}</span>
                              {p.notes && <span className="text-muted-foreground/70 italic text-[10px] mt-0.5">"{p.notes}"</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 rounded-xl border border-dashed border-border/60 bg-muted/5">
                    <p className="text-xs font-semibold text-foreground">Sin consultas previas registradas</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Este paciente aún no tiene visitas en su historial clínico.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="text-xs"
                >
                  Cerrar vista
                </Button>
                <Link
                  href={`/dashboard/pets/${petId}`}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-85 hover:underline transition-opacity shrink-0"
                >
                  <BookOpen size={14} />
                  Ver expediente completo <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
