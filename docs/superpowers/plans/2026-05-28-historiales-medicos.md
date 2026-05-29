# Historiales Médicos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sección `/dashboard/historiales` — búsqueda de mascota por nombre, timeline cronológico de consultas, y descarga en PDF con branding del tenant.

**Architecture:** Dos páginas server component + cuatro client components + un API route para PDF. La búsqueda reutiliza el endpoint `/api/pets?q=` existente (ya es tenant-scoped). La generación de PDF corre en servidor con `@react-pdf/renderer`.

**Tech Stack:** Next.js 15 App Router, Supabase, @react-pdf/renderer, lucide-react, Tailwind CSS v4 (OKLCH)

---

### Task 1: Dependencia + Sidebar

**Files:**
- Modify: `veterinaias/package.json`
- Modify: `veterinaias/components/dashboard/SidebarNav.tsx`

- [ ] **Instalar `@react-pdf/renderer`**

```bash
cd veterinaias && npm install @react-pdf/renderer
```

- [ ] **Agregar "Historiales" al SidebarNav**

En `SidebarNav.tsx`, agregar import y nuevo item:

```tsx
import { Home, Users, PawPrint, Calendar, Settings2, ClipboardList } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Inicio', exact: true },
  { href: '/dashboard/owners', icon: Users, label: 'Dueños' },
  { href: '/dashboard/pets', icon: PawPrint, label: 'Mascotas' },
  { href: '/dashboard/appointments', icon: Calendar, label: 'Citas' },
  { href: '/dashboard/historiales', icon: ClipboardList, label: 'Historiales' },
]
```

- [ ] **Verificar build**

```bash
cd veterinaias && npm run build 2>&1 | tail -20
```

- [ ] **Commit**

```bash
git add veterinaias/package.json veterinaias/package-lock.json veterinaias/components/dashboard/SidebarNav.tsx
git commit -m "feat: add @react-pdf/renderer, add Historiales to sidebar nav"
```

---

### Task 2: Página de búsqueda + `PetSearchHistorial`

**Files:**
- Create: `veterinaias/app/dashboard/historiales/page.tsx`
- Create: `veterinaias/components/historiales/PetSearchHistorial.tsx`

- [ ] **Crear server page**

`veterinaias/app/dashboard/historiales/page.tsx`:

```tsx
import { PetSearchHistorial } from '@/components/historiales/PetSearchHistorial'

export default function HistorialesPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Expediente</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Historiales médicos</h1>
      </div>
      <PetSearchHistorial />
    </div>
  )
}
```

- [ ] **Crear `PetSearchHistorial` client component**

`veterinaias/components/historiales/PetSearchHistorial.tsx`:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface PetResult {
  id: string
  name: string
  breed: string | null
  species: { name: string } | null
  owner: { id: string; full_name: string } | null
}

export function PetSearchHistorial() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PetResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const res = await fetch(`/api/pets?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        if (!res.ok) return
        const json = await res.json()
        setResults(json.data ?? [])
        setSearched(true)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      } finally {
        if (abortRef.current === controller) setLoading(false)
      }
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  return (
    <div className="max-w-xl space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar mascota por nombre..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {!searched && !loading && (
        <p className="text-sm text-muted-foreground">Busca una mascota por nombre para ver su historial.</p>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">Buscando...</p>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No se encontraron mascotas con ese nombre en esta clínica.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(pet => (
            <div key={pet.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm">
              <div>
                <p className="font-semibold text-sm text-foreground">{pet.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[pet.species?.name, pet.breed].filter(Boolean).join(' · ')}
                  {pet.owner && ` — ${pet.owner.full_name}`}
                </p>
              </div>
              <Link
                href={`/dashboard/historiales/${pet.id}`}
                className="text-xs font-medium text-primary hover:underline shrink-0 ml-4"
              >
                Ver historial →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Verificar build**

```bash
cd veterinaias && npm run build 2>&1 | tail -20
```

- [ ] **Commit**

```bash
git add veterinaias/app/dashboard/historiales/page.tsx veterinaias/components/historiales/PetSearchHistorial.tsx
git commit -m "feat: historiales search page and PetSearchHistorial component"
```

---

### Task 3: Timeline page + `MedicalTimeline` + `TimelineEntry`

**Files:**
- Create: `veterinaias/app/dashboard/historiales/[petId]/page.tsx`
- Create: `veterinaias/components/historiales/MedicalTimeline.tsx`
- Create: `veterinaias/components/historiales/TimelineEntry.tsx`

- [ ] **Crear server page del timeline**

`veterinaias/app/dashboard/historiales/[petId]/page.tsx`:

```tsx
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
  const owner = pet.pet_registrations?.[0]?.owner ?? null

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
```

- [ ] **Crear `TimelineEntry`**

`veterinaias/components/historiales/TimelineEntry.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Paperclip } from 'lucide-react'

interface Prescription {
  id: string
  medication_name: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  notes: string | null
}

interface Addendum {
  id: string
  content: string
  created_at: string
  created_by_profile: { full_name: string } | null
}

interface Attachment {
  id: string
  file_name: string
  storage_path: string
}

interface MedicalRecord {
  id: string
  reason: string
  diagnosis: string | null
  treatment: string | null
  notes: string | null
  created_at: string
  weight_kg: number | null
  temperature_celsius: number | null
  heart_rate_bpm: number | null
  respiratory_rate_bpm: number | null
  created_by_profile: { full_name: string } | null
  prescriptions: Prescription[]
  addendums: Addendum[]
  attachments: Attachment[]
}

export function TimelineEntry({ record }: { record: MedicalRecord }) {
  const [addendumOpen, setAddendumOpen] = useState(false)

  const date = new Date(record.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const time = new Date(record.created_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })

  const vitals = [
    record.weight_kg != null && `Peso: ${record.weight_kg} kg`,
    record.temperature_celsius != null && `Temp: ${record.temperature_celsius}°C`,
    record.heart_rate_bpm != null && `FC: ${record.heart_rate_bpm} bpm`,
    record.respiratory_rate_bpm != null && `FR: ${record.respiratory_rate_bpm} rpm`,
  ].filter(Boolean) as string[]

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-sm text-foreground">{record.reason}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {date} · {time}
            {record.created_by_profile?.full_name && ` · Dr. ${record.created_by_profile.full_name}`}
          </p>
        </div>
      </div>

      {/* Fields */}
      {record.diagnosis && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Diagnóstico</p>
          <p className="text-sm text-foreground">{record.diagnosis}</p>
        </div>
      )}
      {record.treatment && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Tratamiento</p>
          <p className="text-sm text-foreground">{record.treatment}</p>
        </div>
      )}
      {record.notes && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Notas</p>
          <p className="text-sm text-foreground">{record.notes}</p>
        </div>
      )}

      {/* Vitals */}
      {vitals.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Signos vitales</p>
          <div className="flex flex-wrap gap-2">
            {vitals.map(v => (
              <span key={v} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Prescriptions */}
      {record.prescriptions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Medicamentos</p>
          <div className="space-y-1.5">
            {record.prescriptions.map(p => (
              <div key={p.id} className="text-xs text-foreground bg-muted/50 rounded-lg px-3 py-2">
                <span className="font-medium">{p.medication_name}</span>
                {[p.dosage, p.frequency, p.duration].filter(Boolean).join(' · ')}
                {p.notes && <span className="text-muted-foreground"> — {p.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {record.attachments.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Adjuntos</p>
          <div className="flex flex-wrap gap-2">
            {record.attachments.map(a => (
              <a
                key={a.id}
                href={`/api/attachments/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Paperclip size={11} />
                {a.file_name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Addendums */}
      {record.addendums.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            onClick={() => setAddendumOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {addendumOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {record.addendums.length} corrección{record.addendums.length !== 1 ? 'es' : ''} posterior{record.addendums.length !== 1 ? 'es' : ''}
          </button>
          {addendumOpen && (
            <div className="mt-2 space-y-2">
              {record.addendums.map(a => (
                <div key={a.id} className="text-xs bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                  <p className="font-medium text-yellow-800 mb-0.5">
                    Corrección posterior ·{' '}
                    {new Date(a.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {a.created_by_profile?.full_name && ` · ${a.created_by_profile.full_name}`}
                  </p>
                  <p className="text-yellow-900">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Crear `MedicalTimeline`**

`veterinaias/components/historiales/MedicalTimeline.tsx`:

```tsx
'use client'

import { TimelineEntry } from './TimelineEntry'

interface MedicalTimelineProps {
  records: any[]
}

export function MedicalTimeline({ records }: MedicalTimelineProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 rounded-[2rem] border-2 border-dashed border-border/60 bg-zinc-50/50">
        <p className="font-bold text-foreground text-lg tracking-tight">Sin consultas registradas</p>
        <p className="text-sm text-muted-foreground mt-2">Este paciente no tiene consultas en el historial aún.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {records.length} consulta{records.length !== 1 ? 's' : ''} · orden cronológico descendente
      </p>
      <div className="relative space-y-3">
        <div className="absolute left-[1.1rem] top-0 bottom-0 w-px bg-border/60 -z-10" />
        <div className="space-y-3 pl-8">
          {records.map((record: any) => (
            <div key={record.id} className="relative">
              <div className="absolute -left-[1.65rem] top-5 w-2.5 h-2.5 rounded-full bg-primary/30 border-2 border-primary/60" />
              <TimelineEntry record={record} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Verificar build**

```bash
cd veterinaias && npm run build 2>&1 | tail -20
```

- [ ] **Commit**

```bash
git add veterinaias/app/dashboard/historiales/[petId]/page.tsx veterinaias/components/historiales/MedicalTimeline.tsx veterinaias/components/historiales/TimelineEntry.tsx
git commit -m "feat: historiales timeline page, MedicalTimeline and TimelineEntry components"
```

---

### Task 4: `PdfDownloadButton` + documento PDF

**Files:**
- Create: `veterinaias/components/historiales/PdfDownloadButton.tsx`
- Create: `veterinaias/lib/pdf/medicalHistoryDocument.tsx`

- [ ] **Crear `PdfDownloadButton`**

`veterinaias/components/historiales/PdfDownloadButton.tsx`:

```tsx
'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PdfDownloadButton({ petId }: { petId: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="gap-2 shrink-0">
      <a href={`/api/historiales/${petId}/pdf`} download>
        <Download size={14} />
        Descargar PDF
      </a>
    </Button>
  )
}
```

- [ ] **Crear documento PDF**

`veterinaias/lib/pdf/medicalHistoryDocument.tsx`:

```tsx
import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  clinicName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0d6b6e' },
  meta: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  label: { fontSize: 9, color: '#6b7280', fontFamily: 'Helvetica-Bold', width: 90 },
  value: { fontSize: 10, flex: 1 },
  divider: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginVertical: 12 },
  entryBox: { backgroundColor: '#f9fafb', borderRadius: 4, padding: 10, marginBottom: 10 },
  entryDate: { fontSize: 9, color: '#6b7280', marginBottom: 4 },
  entryReason: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  fieldLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2, marginTop: 6 },
  fieldValue: { fontSize: 10 },
  vitalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  vitalChip: { backgroundColor: '#e5e7eb', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, fontSize: 9 },
  rxRow: { flexDirection: 'row', gap: 8, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  rxName: { fontFamily: 'Helvetica-Bold', width: 120 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#9ca3af' },
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function calcAge(dob: string) {
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  return years > 0 ? `${years} año${years !== 1 ? 's' : ''}` : '< 1 año'
}

interface PdfData {
  pet: any
  owner: any
  records: any[]
  tenantName: string
  tenantLogoUrl: string | null
  generatedAt: string
}

export function MedicalHistoryDocument({ pet, owner, records, tenantName, tenantLogoUrl, generatedAt }: PdfData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.clinicName}>{tenantName}</Text>
            <Text style={styles.meta}>Historial médico generado el {generatedAt}</Text>
          </View>
          {tenantLogoUrl && <Image src={tenantLogoUrl} style={styles.logo} />}
        </View>

        {/* Patient */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del paciente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text><Text style={styles.value}>{pet.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Especie</Text><Text style={styles.value}>{pet.species?.name ?? '—'}</Text>
            <Text style={styles.label}>Raza</Text><Text style={styles.value}>{pet.breed ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sexo</Text><Text style={styles.value}>{pet.sex ?? '—'}</Text>
            <Text style={styles.label}>Nacimiento</Text>
            <Text style={styles.value}>
              {pet.date_of_birth ? `${formatDate(pet.date_of_birth)} (${calcAge(pet.date_of_birth)})` : '—'}
            </Text>
          </View>
          {pet.color && <View style={styles.row}><Text style={styles.label}>Color</Text><Text style={styles.value}>{pet.color}</Text></View>}
          {pet.microchip && <View style={styles.row}><Text style={styles.label}>Microchip</Text><Text style={styles.value}>{pet.microchip}</Text></View>}
        </View>

        {/* Owner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dueño</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text><Text style={styles.value}>{owner?.full_name ?? '—'}</Text>
          </View>
          {owner?.phone && (
            <View style={styles.row}><Text style={styles.label}>Teléfono</Text><Text style={styles.value}>{owner.phone}</Text></View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Records */}
        <Text style={styles.sectionTitle}>Historial de consultas ({records.length})</Text>
        {records.map((rec: any) => (
          <View key={rec.id} style={styles.entryBox} wrap={false}>
            <Text style={styles.entryDate}>
              {formatDate(rec.created_at)}
              {rec.created_by_profile?.full_name ? ` · Dr. ${rec.created_by_profile.full_name}` : ''}
            </Text>
            <Text style={styles.entryReason}>{rec.reason}</Text>

            {rec.diagnosis && <>
              <Text style={styles.fieldLabel}>Diagnóstico</Text>
              <Text style={styles.fieldValue}>{rec.diagnosis}</Text>
            </>}
            {rec.treatment && <>
              <Text style={styles.fieldLabel}>Tratamiento</Text>
              <Text style={styles.fieldValue}>{rec.treatment}</Text>
            </>}
            {rec.notes && <>
              <Text style={styles.fieldLabel}>Notas</Text>
              <Text style={styles.fieldValue}>{rec.notes}</Text>
            </>}

            {/* Vitals */}
            {[rec.weight_kg, rec.temperature_celsius, rec.heart_rate_bpm, rec.respiratory_rate_bpm].some(v => v != null) && (
              <>
                <Text style={styles.fieldLabel}>Signos vitales</Text>
                <View style={styles.vitalsRow}>
                  {rec.weight_kg != null && <Text style={styles.vitalChip}>Peso: {rec.weight_kg} kg</Text>}
                  {rec.temperature_celsius != null && <Text style={styles.vitalChip}>Temp: {rec.temperature_celsius}°C</Text>}
                  {rec.heart_rate_bpm != null && <Text style={styles.vitalChip}>FC: {rec.heart_rate_bpm} bpm</Text>}
                  {rec.respiratory_rate_bpm != null && <Text style={styles.vitalChip}>FR: {rec.respiratory_rate_bpm} rpm</Text>}
                </View>
              </>
            )}

            {/* Prescriptions */}
            {rec.prescriptions?.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Medicamentos</Text>
                {rec.prescriptions.map((p: any) => (
                  <View key={p.id} style={styles.rxRow}>
                    <Text style={styles.rxName}>{p.medication_name}</Text>
                    <Text>{[p.dosage, p.frequency, p.duration].filter(Boolean).join(' · ')}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Attachments — names only */}
            {rec.attachments?.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Archivos adjuntos</Text>
                <Text style={styles.fieldValue}>{rec.attachments.map((a: any) => a.file_name).join(', ')}</Text>
              </>
            )}

            {/* Addendums */}
            {rec.addendums?.length > 0 && rec.addendums.map((a: any) => (
              <View key={a.id} style={{ marginTop: 6, backgroundColor: '#fef9c3', borderRadius: 3, padding: 6 }}>
                <Text style={{ fontSize: 8, color: '#92400e', fontFamily: 'Helvetica-Bold' }}>
                  Corrección · {formatDate(a.created_at)}
                  {a.created_by_profile?.full_name ? ` · ${a.created_by_profile.full_name}` : ''}
                </Text>
                <Text style={{ fontSize: 9, color: '#78350f', marginTop: 2 }}>{a.content}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Historial generado el ${generatedAt} | petMedical.app          Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}
```

- [ ] **Verificar build**

```bash
cd veterinaias && npm run build 2>&1 | tail -20
```

- [ ] **Commit**

```bash
git add veterinaias/components/historiales/PdfDownloadButton.tsx veterinaias/lib/pdf/medicalHistoryDocument.tsx
git commit -m "feat: PdfDownloadButton and MedicalHistoryDocument PDF template"
```

---

### Task 5: API route PDF

**Files:**
- Create: `veterinaias/app/api/historiales/[petId]/pdf/route.ts`

- [ ] **Crear el route**

`veterinaias/app/api/historiales/[petId]/pdf/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { MedicalHistoryDocument } from '@/lib/pdf/medicalHistoryDocument'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ petId: string }> },
) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(name, settings)')
    .eq('id', user.id)
    .single() as any

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  // Verify pet belongs to tenant
  const { data: reg } = await (supabase.from('pet_registrations') as any)
    .select('pet_id')
    .eq('pet_id', petId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!reg) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  const [petRes, recordsRes] = await Promise.all([
    (supabase.from('pets') as any)
      .select(`
        id, name, sex, date_of_birth, breed, microchip, color,
        species:species_id(name),
        pet_registrations!inner(owner:owner_id(full_name, phone))
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

  if (!petRes.data) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })

  const pet = petRes.data as any
  const owner = pet.pet_registrations?.[0]?.owner ?? null
  const records = (recordsRes.data ?? []) as any[]
  const tenant = profile.tenants as any
  const generatedAt = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const buffer = await renderToBuffer(
    createElement(MedicalHistoryDocument, {
      pet,
      owner,
      records,
      tenantName: tenant?.name ?? 'Clínica Veterinaria',
      tenantLogoUrl: tenant?.settings?.logo_url ?? null,
      generatedAt,
    })
  )

  const petName = (pet.name as string).toLowerCase().replace(/\s+/g, '-')
  const dateStr = new Date().toISOString().split('T')[0]

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="historial-${petName}-${dateStr}.pdf"`,
    },
  })
}
```

- [ ] **Verificar build**

```bash
cd veterinaias && npm run build 2>&1 | tail -20
```

- [ ] **Commit**

```bash
git add veterinaias/app/api/historiales/[petId]/pdf/route.ts
git commit -m "feat: PDF API route for medical history download"
```
