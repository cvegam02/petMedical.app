import Link from 'next/link'
import { getUser, getCachedProfile } from '@/lib/queries/profile'
import type { TenantSettings } from '@/lib/types/database'
import { ClinicaForm } from '@/components/settings/ClinicaForm'
import { ConfiguracionForm } from '@/components/settings/ConfiguracionForm'
import { PrescriptionConfigForm } from '@/components/settings/PrescriptionConfigForm'

type ClinicaTab = 'info' | 'general' | 'recetas'

const TABS: { value: ClinicaTab; label: string; href: string }[] = [
  { value: 'info',    label: 'Información', href: '/dashboard/settings/clinica' },
  { value: 'general', label: 'General',     href: '/dashboard/settings/clinica?tab=general' },
  { value: 'recetas', label: 'Recetas',     href: '/dashboard/settings/clinica?tab=recetas' },
]

export default async function SettingsClinicaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab } = await searchParams
  const tab: ClinicaTab =
    rawTab === 'general' ? 'general'
    : rawTab === 'recetas' ? 'recetas'
    : 'info'

  const user = await getUser()
  if (!user) return null

  const profile = await getCachedProfile(user.id)
  const tenant   = profile?.tenants
  const settings: Partial<TenantSettings> = tenant?.settings ?? {}

  return (
    <div className="space-y-6">

      {/* Sub-tab nav */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ value, label, href }) => (
          <Link
            key={value}
            href={href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Content */}
      {tab === 'info' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Datos de la clínica</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Esta información aparece en PDFs y documentos generados.
            </p>
          </div>
          <ClinicaForm
            name={tenant?.name ?? ''}
            address={settings.address ?? null}
            phone={settings.phone ?? null}
            logoUrl={settings.logo_url ?? null}
          />
        </div>
      )}

      {tab === 'general' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Configuración general</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ajusta el comportamiento de la plataforma para tu clínica.
            </p>
          </div>
          <ConfiguracionForm
            confirmationReminderDays={settings.confirmation_reminder_days ?? 2}
            shareLinkExpiryDays={settings.share_link_expiry_days ?? 7}
          />
        </div>
      )}

      {tab === 'recetas' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recetas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configura los textos opcionales que aparecen en las recetas impresas.
            </p>
          </div>
          <PrescriptionConfigForm
            footerNote={settings.prescription_footer_note ?? null}
            validityDays={settings.prescription_validity_days ?? null}
          />
        </div>
      )}

    </div>
  )
}
