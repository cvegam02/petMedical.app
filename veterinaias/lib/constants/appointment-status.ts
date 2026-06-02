// Each appointment status maps to ONE distinct color. Color = status (never service type).
// `className` = badge (bg/text/border); `stripe` = solid bar/dot color.
export const APPOINTMENT_STATUS_CONFIG: Record<string, { label: string; className: string; stripe: string }> = {
  scheduled: { label: 'Programada',     className: 'bg-slate-100 text-slate-600 border-slate-200',             stripe: 'bg-slate-400' },
  confirmed: { label: 'Confirmada',     className: 'bg-primary/10 text-primary border-primary/20',             stripe: 'bg-primary' },
  completed: { label: 'Completada',     className: 'bg-green-50 text-green-700 border-green-200',              stripe: 'bg-green-500' },
  cancelled: { label: 'Cancelada',      className: 'bg-destructive/10 text-destructive border-destructive/20', stripe: 'bg-destructive' },
  no_show:   { label: 'No se presentó', className: 'bg-orange-50 text-orange-600 border-orange-200',           stripe: 'bg-orange-400' },
}
