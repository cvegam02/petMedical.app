'use client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { VaccineCatalogTab } from '@/components/settings/VaccineCatalogTab'
import { MedicationCatalogTab } from '@/components/settings/MedicationCatalogTab'

type Tab = 'vaccines' | 'medications'

const TABS: { value: Tab; label: string; param?: string }[] = [
  { value: 'vaccines',    label: 'Vacunas' },
  { value: 'medications', label: 'Medicamentos', param: 'medicamentos' },
]

export default function InsumosPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const rawTab = searchParams.get('tab')
  const tab: Tab = rawTab === 'medicamentos' ? 'medications' : 'vaccines'

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
        <h2 className="text-base font-semibold text-foreground">Insumos</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Vacunas y medicamentos disponibles en tu clínica.
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
      </div>
    </div>
  )
}
