'use client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { VaccineCatalogTab } from '@/components/settings/VaccineCatalogTab'
import { MedicationCatalogTab } from '@/components/settings/MedicationCatalogTab'
import { GroomingServiceCatalogTab } from '@/components/settings/GroomingServiceCatalogTab'

type Tab = 'vaccines' | 'medications' | 'estetica'

const TABS: { value: Tab; label: string; param?: string }[] = [
  { value: 'vaccines',    label: 'Vacunas' },
  { value: 'medications', label: 'Medicamentos', param: 'medicamentos' },
  { value: 'estetica',    label: 'Estética',     param: 'estetica' },
]

export default function CatalogosPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const rawTab = searchParams.get('tab')
  const tab: Tab =
    rawTab === 'medicamentos' ? 'medications'
    : rawTab === 'estetica'   ? 'estetica'
    : 'vaccines'

  function navigate(t: Tab) {
    const tabConfig = TABS.find(x => x.value === t)
    if (tabConfig?.param) {
      router.push(`${pathname}?tab=${tabConfig.param}`)
    } else {
      router.push(pathname)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Catálogos</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestiona las vacunas, medicamentos y servicios disponibles en tu clínica.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => navigate(value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === value
                ? 'border-secondary-foreground text-secondary-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'vaccines'    && <VaccineCatalogTab />}
        {tab === 'medications' && <MedicationCatalogTab />}
        {tab === 'estetica'    && <GroomingServiceCatalogTab />}
      </div>
    </div>
  )
}
