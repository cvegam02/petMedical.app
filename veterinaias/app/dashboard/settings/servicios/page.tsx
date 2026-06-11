import { GroomingServiceCatalogTab } from '@/components/settings/GroomingServiceCatalogTab'

export default function ServiciosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Servicios</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Catálogo de servicios de estética y peluquería.
        </p>
      </div>
      <GroomingServiceCatalogTab />
    </div>
  )
}
