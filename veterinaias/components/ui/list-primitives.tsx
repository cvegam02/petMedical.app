import React from 'react'

// ---------------------------------------------------------------------------
// ListSkeleton — uniform loading state for all 6 list components
// ---------------------------------------------------------------------------
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-card rounded-[1.5rem] border border-border overflow-hidden divide-y divide-[#f3f5f7]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-3">
          <div className="w-9 h-9 rounded-[10px] bg-muted/40 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-[13px] w-1/4 bg-muted/40 animate-pulse rounded-[6px]" />
            <div className="h-[10px] w-1/6 bg-muted/20 animate-pulse rounded-[6px]" />
          </div>
          <div className="w-1/3 space-y-2">
            <div className="h-[12px] w-2/3 bg-muted/30 animate-pulse rounded-[6px]" />
          </div>
          <div className="w-16 h-[10px] bg-muted/20 animate-pulse rounded-[6px]" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ListFooter — count + "Actualizado" status, shared across all 6 lists
// ---------------------------------------------------------------------------
interface ListFooterProps { count: number; label: string }

export function ListFooter({ count, label }: ListFooterProps) {
  return (
    <div className="px-6 py-[9px] bg-[#fafbfc] border-t border-[#f3f5f7] flex items-center justify-between">
      <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
        {count} {label}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="w-[5px] h-[5px] rounded-full bg-primary" />
        <span className="text-[9px] font-bold text-primary uppercase tracking-[0.05em]">Actualizado</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SectionHeader — amber (En curso) · blue (Hoy) · muted (Historial/Próximas)
// ---------------------------------------------------------------------------
type SectionVariant = 'amber' | 'blue' | 'muted'

const VARIANT_STYLES: Record<SectionVariant, {
  bg: string; border: string; text: string; dot?: string
  badgeBg: string; badgeText: string
}> = {
  amber: {
    bg: 'bg-[#fffbeb]', border: 'border-b border-[#fde68a]',
    text: 'text-[#92400e]', dot: 'bg-amber-400',
    badgeBg: 'bg-[#fde68a]', badgeText: 'text-[#92400e]',
  },
  blue: {
    bg: 'bg-[#F3F8FC]', border: 'border-b border-[rgba(15,76,129,0.1)]',
    text: 'text-[#0F4C81]', dot: 'bg-[#337DB9]',
    badgeBg: 'bg-[rgba(15,76,129,0.1)]', badgeText: 'text-[#0F4C81]',
  },
  muted: {
    bg: 'bg-[#fafbfc]', border: 'border-b border-[#e7ebef]',
    text: 'text-muted-foreground/60',
    badgeBg: 'bg-[#f3f5f7]', badgeText: 'text-muted-foreground',
  },
}

interface SectionHeaderProps { variant: SectionVariant; title: string; count?: number }

export function SectionHeader({ variant, title, count }: SectionHeaderProps) {
  const s = VARIANT_STYLES[variant]
  return (
    <div className={`flex items-center gap-2 px-4 py-[9px] ${s.bg} ${s.border}`}>
      {s.dot && <span className={`w-[7px] h-[7px] rounded-full ${s.dot} shrink-0`} />}
      <p className={`text-[9px] font-bold uppercase tracking-[0.15em] ${s.text} flex-1`}>{title}</p>
      {count !== undefined && (
        <span className={`font-mono text-[10px] font-bold px-[7px] py-[1px] rounded-[4px] ${s.badgeBg} ${s.badgeText}`}>
          {count}
        </span>
      )}
    </div>
  )
}
