import { redirect } from 'next/navigation'
import { getUser, getCachedProfile } from '@/lib/queries/profile'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getCachedProfile(user.id)
  if (profile?.role !== 'admin') redirect('/dashboard')

  return <>{children}</>
}
