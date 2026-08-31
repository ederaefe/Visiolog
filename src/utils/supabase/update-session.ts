import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isUserAdmin } from '@/lib/auth-constants'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // In local standalone mode (or when Supabase credentials are not configured), bypass cloud auth
  const isCloudConfigured = !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    !supabaseUrl.includes('dummy')
  )

  if (!isCloudConfigured || process.env.LOCAL_FIRST === 'true') {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

            const cookieHeader = request.cookies.getAll().map(c => `${c.name}=${c.value}`).join('; ')
            request.headers.set('cookie', cookieHeader)

            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Stealth 404 security for /admin:
    if (pathname.startsWith('/admin')) {
      if (!user || !isUserAdmin(user.email)) {
        return NextResponse.rewrite(new URL('/_not-found', request.url))
      }
    }

    // Public paths accessible by anyone
    const isPublicPath =
      pathname === '/' ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/privacy') ||
      pathname.startsWith('/terms') ||
      pathname.startsWith('/contact') ||
      pathname.startsWith('/api/webhooks') ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname === '/favicon.ico' ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.webmanifest')

    // If user is NOT logged in and attempting to access a protected route
    if (!user && !isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(c =>
        redirectResponse.cookies.set(c.name, c.value)
      )
      return redirectResponse
    }

    // If user IS logged in and attempts to access /auth or /login, redirect to /projects
    const isSwitchingAccount = request.nextUrl.searchParams.get('flush') === 'true' || request.nextUrl.searchParams.get('switch') === 'true'
    if (
      user &&
      !isSwitchingAccount &&
      (pathname.startsWith('/auth') || pathname.startsWith('/login')) &&
      !pathname.startsWith('/auth/signout') &&
      !pathname.startsWith('/auth/callback')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/projects'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(c =>
        redirectResponse.cookies.set(c.name, c.value)
      )
      return redirectResponse
    }

    return supabaseResponse
  } catch {
    // If auth resolution encounters edge network issues, fallback to allowing local navigation
    return NextResponse.next({ request })
  }
}
