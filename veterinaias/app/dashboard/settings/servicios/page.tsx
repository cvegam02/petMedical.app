'use client'
import { useState } from 'react'
import { GroomingServiceCatalogTab } from '@/components/settings/GroomingServiceCatalogTab'

type Tab = 'grooming'

export default function ServiciosPage() {
  const [tab, setTab] = useState<Tab>('grooming')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Servicios</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configura los servicios adicionales que ofrece tu clínica.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['grooming', 'Estética']] as [Tab, string][]).map(([value, label]) => (
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
        {tab === 'grooming' && <GroomingServiceCatalogTab />}
      </div>
    </div>
  )
}
