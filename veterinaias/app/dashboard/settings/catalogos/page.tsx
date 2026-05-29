'use client'
import { useState } from 'react'
import { VaccineCatalogTab } from '@/components/settings/VaccineCatalogTab'
import { MedicationCatalogTab } from '@/components/settings/MedicationCatalogTab'

type Tab = 'vaccines' | 'medications'

export default function CatalogosPage() {
  const [tab, setTab] = useState<Tab>('vaccines')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Catálogos</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Gestiona las vacunas y medicamentos disponibles en tu clínica.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['vaccines', 'Vacunas'], ['medications', 'Medicamentos']] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'vaccines' ? <VaccineCatalogTab /> : <MedicationCatalogTab />}
      </div>
    </div>
  )
}
