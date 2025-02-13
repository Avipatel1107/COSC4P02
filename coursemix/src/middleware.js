import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  try {
    // Create a response object that we can modify
    const res = NextResponse.next()
    
    // Create supabase client with both req and res
    const supabase = createMiddlewareClient({ req, res })

    // Refresh the session and get the latest session data
    await supabase.auth.getSession()

    // Get a new session after refresh
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    // Get the current URL path and search params
    const path = req.nextUrl.pathname
    const searchParams = req.nextUrl.searchParams
    const redirect = searchParams.get('redirect')
    
    console.log('Middleware processing path:', path)
    if (session) {
      console.log('Session found for user:', session.user.email)
    } else {
      console.log('No session found')
    }
    if (error) {
      console.error('Session error:', error)
    }

    // If on sign-in page with a session, handle redirect
    if (session && path === '/signin') {
      if (redirect && redirect.startsWith('/protected')) {
        return NextResponse.redirect(new URL(redirect, req.url))
      }
      return NextResponse.redirect(new URL('/protected/dashboard', req.url))
    }

    // If accessing protected route without session
    if (!session && path.startsWith('/protected')) {
      const redirectUrl = new URL('/signin', req.url)
      redirectUrl.searchParams.set('redirect', path)
      return NextResponse.redirect(redirectUrl)
    }

    // If accessing auth pages with session
    if (session && (path === '/' || path === '/signup' || path === '/register')) {
      return NextResponse.redirect(new URL('/protected/dashboard', req.url))
    }

    // Add session user to request headers for client components
    if (session?.user) {
      res.headers.set('x-user-id', session.user.id)
      res.headers.set('x-user-email', session.user.email)
    }

    // Set cookie consent header if not present
    if (!req.cookies.get('cookie_consent')) {
      res.cookies.set('cookie_consent_shown', 'false', {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: '/'
      })
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, allow the request to continue but log the error
    return NextResponse.next()
  }
}

// Update matcher to be more specific about protected routes
export const config = {
  matcher: [
    // Auth routes
    '/signin',
    '/signup',
    '/register',
    // Protected routes
    '/protected/:path*',
    // Public home page
    '/',
  ],
} 