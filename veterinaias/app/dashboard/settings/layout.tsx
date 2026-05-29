import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsNav } from '@/components/settings/SettingsNav'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'admin') redirect('/dashboard')

  return (
    <div>
      <div className="space-y-1 mb-6">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Administración</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración</h1>
      </div>
      <SettingsNav />
      {children}
    </div>
  )
}
