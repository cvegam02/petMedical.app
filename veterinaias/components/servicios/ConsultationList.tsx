'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Stethoscope } from 'lucide-react'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface ConsultationRow {
  id: string
  created_at: string
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string } | null
  reason: string | null
  diagnosis: string | null
  attended_by: string | null
  attended_by_name: string | null
}

interface TeamMember {
  id: string
  full_name: string
}

interface Props {
  team: TeamMember[]
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function ConsultationList({ team }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<ConsultationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVet, setSelectedVet] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  async function load(vet: string, from: string, to: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (vet) params.set('vet', vet)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/servicios/consulta?${params.toString()}`)
      const json = await res.json()
      setRows(json.data ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(selectedVet, fromDate, toDate) }, [selectedVet, fromDate, toDate])

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Veterinario</Label>
          <select
            value={selectedVet}
            onChange={e => setSelectedVet(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos los veterinarios</option>
            {team.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        {(selectedVet || fromDate || toDate) && (
          <button
            type="button"
            onClick={() => { setSelectedVet(''); setFromDate(''); setToDate('') }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors h-9 px-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Stethoscope size={32} className="text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">No hay consultas registradas.</p>
          <Link href="/dashboard/records/new" className="text-xs text-primary hover:underline">
            Registrar consulta
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Paciente</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Especie</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Dueño</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Motivo</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Veterinario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => row.pet?.id && router.push(`/dashboard/pets/${row.pet.id}/records/${row.id}`)}
                  className="hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{row.pet?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.pet?.species?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.owner?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{row.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.attended_by_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
