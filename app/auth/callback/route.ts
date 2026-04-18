import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Supabase sends ?error=access_denied&error_description=... when the
  // email link is invalid, expired, or redirect URL isn't whitelisted.
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (errorParam) {
    const msg = encodeURIComponent(
      errorDescription?.replace(/\+/g, ' ') ||
      'Email confirmation failed. The link may have expired.'
    )
    return NextResponse.redirect(`${origin}/login?error=${msg}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    // Code exchange failed — pass the real error to the login page
    const msg = encodeURIComponent(error.message || 'Could not confirm email. Please try again.')
    return NextResponse.redirect(`${origin}/login?error=${msg}`)
  }

  // No code and no error — something unexpected happened
  return NextResponse.redirect(
    `${origin}/login?error=Email+confirmation+link+is+invalid+or+has+expired.`
  )
}
