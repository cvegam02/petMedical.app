import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormPageLayoutProps {
  backHref: string
  backLabel: string
  overline: string
  title: string
  contextPanel?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function FormPageLayout({
  backHref,
  backLabel,
  overline,
  title,
  contextPanel,
  children,
  className,
}: FormPageLayoutProps) {
  return (
    <div className={cn("max-w-5xl mx-auto pb-10", className)}>
      <div className="flex items-center gap-1.5 mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          {backLabel}
        </Link>
        <span className="text-muted-foreground/40 text-sm">/</span>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">
            {overline}
          </p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>

      <div
        className={cn(
          contextPanel
            ? "grid grid-cols-1 lg:grid-cols-[1fr_256px] gap-8 items-start"
            : "max-w-2xl"
        )}
      >
        <div>{children}</div>
        {contextPanel}
      </div>
    </div>
  )
}
