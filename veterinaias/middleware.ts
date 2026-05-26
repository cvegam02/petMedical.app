import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/accept-invite']
const SUPER_ADMIN_ROUTES = ['/super-admin']
const ONBOARDING_ROUTE = '/onboarding'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Public routes: redirect to dashboard if already authenticated
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    if (user) return NextResponse.redirect(new URL('/dashboard', request.url))
    return response
  }

  // No session: redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check tenant and super admin status
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, is_super_admin')
    .eq('id', user.id)
    .single()

  // Super admin: only /super-admin routes
  if (profile?.is_super_admin) {
    if (!SUPER_ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/super-admin', request.url))
    }
    return response
  }

  // No tenant: force onboarding
  if (!profile?.tenant_id && pathname !== ONBOARDING_ROUTE) {
    return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
  }

  // Has tenant but on onboarding: redirect to dashboard
  if (profile?.tenant_id && pathname === ONBOARDING_ROUTE) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|share/).*)'],
}
