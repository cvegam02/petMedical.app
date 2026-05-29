'use client'
import { Download } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
export function PdfDownloadButton({ petId }: { petId: string }) {
  return (
    <a
      href={`/api/historiales/${petId}/pdf`}
      download
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2 shrink-0')}
    >
      <Download size={14} />
      Descargar PDF
    </a>
  )
}
