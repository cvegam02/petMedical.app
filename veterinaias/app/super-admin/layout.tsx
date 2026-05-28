import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await (supabase.from('user_profiles') as any)
    .select('is_super_admin, full_name')
    .eq('id', user!.id)
    .single()

  if (!profile?.is_super_admin) redirect('/dashboard')

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <p className="text-sm">pet<span className="font-bold">Medical</span>.app</p>
          <p className="text-xs text-slate-400">Super Admin</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/super-admin" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Tenants</Link>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <p className="text-sm text-slate-300">{profile.full_name}</p>
        </div>
      </aside>
      <main className="flex-1 p-8 bg-slate-50 overflow-auto">
        {children}
      </main>
    </div>
  )
}
