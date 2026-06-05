'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Cat, Dog, PawPrint } from 'lucide-react'

interface StayRow {
  id: string
  started_at: string | null
  ended_at: string | null
  expected_check_out: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short',
  })
}

function getPetIcon(speciesName: string | null | undefined) {
  const s = speciesName?.toLowerCase() ?? ''
  if (s.includes('fel') || s.includes('gat')) return Cat
  if (s.includes('can') || s.includes('perr')) return Dog
  return PawPrint
}

export function BoardingHistoryTable() {
  const router = useRouter()
  const [stays, setStays] = useState<StayRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/servicios/hotel')
      const json = await res.json()
      const all: StayRow[] = json.data ?? []
      setStays(all.filter(s => !!s.ended_at))
    } catch {
      setStays([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const refetch = () => load()
    window.addEventListener('hotel:changed', refetch)
    return () => window.removeEventListener('hotel:changed', refetch)
  }, [])

  if (loading || stays.length === 0) return null

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em]">Historial</p>
        <span className="inline-flex items-center justify-center bg-muted text-muted-foreground text-[12px] font-mono px-2 py-0.5 rounded-md border border-border/50">
          {stays.length}
        </span>
      </div>

      <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-6 px-6 py-5 bg-muted/20 border-b border-border/60">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex-1">Mascota</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-28">Entrada</p>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-28">Salida</p>
          <div className="w-9" />
        </div>

        <div className="divide-y divide-border/40">
          {stays.map((s, index) => {
            const PetIcon = getPetIcon(s.pet?.species?.name)
            return (
              <div
                key={s.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div
                  className="group relative flex items-center gap-6 py-5 px-6 hover:bg-primary/[0.01] active:scale-[0.998] transition-all duration-300 cursor-pointer"
                  onClick={() => router.push(`/dashboard/servicios/hotel/${s.id}`)}
                >
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full group-hover:h-8 transition-all duration-300" />

                  {/* Pet identity */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted/50 to-muted border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-500 shadow-sm shrink-0">
                      <PetIcon size={22} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-[15px] leading-tight tracking-tight truncate group-hover:text-primary transition-colors">
                        {s.pet?.name ?? '—'}
                      </p>
                      {s.pet?.species?.name && (
                        <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{s.pet.species.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Check-in */}
                  <div className="w-28 shrink-0">
                    <p className="text-[13px] font-medium text-foreground">{formatDate(s.started_at)}</p>
                  </div>

                  {/* Check-out */}
                  <div className="w-28 shrink-0">
                    <p className="text-[13px] font-medium text-muted-foreground">{formatDate(s.ended_at)}</p>
                  </div>

                  {/* Chevron */}
                  <div className="shrink-0 flex items-center">
                    <div className="w-9 h-9 rounded-xl bg-muted/20 border border-transparent flex items-center justify-center text-muted-foreground/30 group-hover:text-primary group-hover:bg-white group-hover:border-border group-hover:shadow-sm transition-all duration-300">
                      <ChevronRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-muted/5 border-t border-border/40 flex items-center justify-between">
          <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
            {stays.length} {stays.length === 1 ? 'estadía completada' : 'estadías completadas'}
          </p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
            <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Historial actualizado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
