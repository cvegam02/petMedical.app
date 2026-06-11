import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TenantSettings } from '@/lib/types/database'

export type CachedProfile = {
  full_name: string
  role: string
  tenant_id: string | null
  tenants: { name: string; settings: TenantSettings | null } | null
}

// Deduplicates getUser() calls within the same server render pass
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

// unstable_cache cannot call cookies() — use the service-role client.
// The caller (getUser) has already verified identity; userId is the cache key.
const fetchProfile = unstable_cache(
  async (userId: string): Promise<CachedProfile | null> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('user_profiles')
      .select('full_name, role, tenant_id, tenants(name, settings)')
      .eq('id', userId)
      .single()
    return (data ?? null) as CachedProfile | null
  },
  ['profile'],
  { revalidate: 300, tags: ['profiles'] },
)

// React.cache deduplicates within a request (e.g. dashboard layout + settings layout).
// unstable_cache persists results across navigations for up to 5 minutes.
// Invalidate with revalidateTag('profiles', 'max') after any profile/tenant write.
export const getCachedProfile = cache(fetchProfile)
