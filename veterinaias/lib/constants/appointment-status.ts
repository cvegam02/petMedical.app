export const APPOINTMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Programada',     className: 'bg-muted text-muted-foreground border-border' },
  confirmed: { label: 'Confirmada',     className: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Completada',     className: 'bg-primary/20 text-primary border-primary/30' },
  cancelled: { label: 'Cancelada',      className: 'bg-destructive/10 text-destructive border-destructive/20' },
  no_show:   { label: 'No se presentó', className: 'bg-orange-50 text-orange-600 border-orange-200' },
}
