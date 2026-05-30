import { PawPrint } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
            <PawPrint size={26} className="text-primary" strokeWidth={2} />
          </div>
          <p className="text-2xl font-medium text-foreground tracking-tight">
            Mundo<span className="font-bold">Pet</span>
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
