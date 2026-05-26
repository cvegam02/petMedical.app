import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'

export default async function SuperAdminPage() {
  const admin = createAdminClient()

  const { data: tenants } = await (admin.from('tenants') as any)
    .select('id, name, type, subscription_status, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tenants</h1>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {['Nombre', 'Tipo', 'Estado', 'Creado'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants?.map((t: any) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3"><Badge variant="outline">{t.type}</Badge></td>
                <td className="px-4 py-3"><Badge>{t.subscription_status}</Badge></td>
                <td className="px-4 py-3 text-slate-500">{new Date(t.created_at).toLocaleDateString('es')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
