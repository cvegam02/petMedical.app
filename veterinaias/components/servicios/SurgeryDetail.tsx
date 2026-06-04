'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Syringe, ChevronLeft } from 'lucide-react'

interface Prescription { id: string; medication_name: string; dosage: string; frequency: string; duration: string; route_of_administration: string | null; notes: string | null }
interface Surgery {
  id: string; started_at: string | null; ended_at: string | null; scheduled_at: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string } | null
  procedure: string | null; diagnosis: string | null; weight_kg: number | null
  pre_op_notes: string | null; anesthesia_type: string | null; anesthesia_notes: string | null
  findings: string | null; complications: string | null; supplies: string | null
  post_op_notes: string | null; recovery_instructions: string | null; follow_up_date: string | null
  attended_by_name: string | null; prescriptions: Prescription[]
}

function fmtDateTime(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{value || '—'}</p>
    </div>
  )
}

export function SurgeryDetail({ visitId }: { visitId: string }) {
  const [s, setS] = useState<Surgery | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/servicios/cirugia/${visitId}`)
      const json = await res.json()
      setS(res.ok ? json.data : null)
    } catch {
      setS(null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [visitId])

  if (loading) return <div className="max-w-4xl mx-auto pb-10"><p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p></div>
  if (!s) return (
    <div className="max-w-4xl mx-auto pb-10">
      <Link href="/dashboard/servicios/cirugia" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft size={14} />Cirugía</Link>
      <div className="text-center py-16 mt-8 rounded-xl border-2 border-dashed border-border/60 bg-muted/10"><p className="text-sm font-medium text-foreground">Cirugía no encontrada</p></div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/servicios/cirugia" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft size={14} />Cirugía</Link>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-8 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="w-11 h-11 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center text-muted-foreground/50 shrink-0">
            <Syringe size={24} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{s.pet?.name ?? '—'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{s.procedure || 'Cirugía'}{s.pet?.species?.name ? ` · ${s.pet.species.name}` : ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-border/60">
          <div>
            <p className="label-overline text-muted-foreground/50">{s.started_at ? 'Inicio' : 'Agendada'}</p>
            <p className="text-sm text-foreground mt-0.5">{fmtDateTime(s.started_at ?? s.scheduled_at)}</p>
          </div>
          <div>
            <p className="label-overline text-muted-foreground/50">Fin</p>
            <p className="text-sm text-foreground mt-0.5">{fmtDateTime(s.ended_at)}</p>
          </div>
          <div><p className="label-overline text-muted-foreground/50">Veterinario</p><p className="text-sm text-foreground mt-0.5">{s.attended_by_name || '—'}</p></div>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <p className="label-overline text-muted-foreground/50 mb-2.5">Pre-operatorio</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Diagnóstico / motivo" value={s.diagnosis} />
            <Field label="Peso (kg)" value={s.weight_kg != null ? String(s.weight_kg) : null} />
            <Field label="Notas pre-op" value={s.pre_op_notes} />
          </div>
        </section>
        <section>
          <p className="label-overline text-muted-foreground/50 mb-2.5">Anestesia</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Tipo" value={s.anesthesia_type} />
            <div className="sm:col-span-2"><Field label="Notas" value={s.anesthesia_notes} /></div>
          </div>
        </section>
        <section>
          <p className="label-overline text-muted-foreground/50 mb-2.5">Procedimiento</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Hallazgos / técnica" value={s.findings} />
            <Field label="Complicaciones" value={s.complications} />
            <Field label="Insumos" value={s.supplies} />
          </div>
        </section>
        <section>
          <p className="label-overline text-muted-foreground/50 mb-2.5">Post-operatorio</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Notas post-op" value={s.post_op_notes} />
            <Field label="Indicaciones de recuperación" value={s.recovery_instructions} />
            <Field label="Próximo control" value={fmtDate(s.follow_up_date)} />
          </div>
        </section>
        {s.prescriptions.length > 0 && (
          <section>
            <p className="label-overline text-muted-foreground/50 mb-2.5">Recetas</p>
            <div className="space-y-2">
              {s.prescriptions.map(p => (
                <div key={p.id} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">{p.medication_name} · {p.dosage}</p>
                  <p className="text-xs text-muted-foreground">{[p.route_of_administration, p.frequency, p.duration].filter(Boolean).join(' · ')}{p.notes ? ` — ${p.notes}` : ''}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
