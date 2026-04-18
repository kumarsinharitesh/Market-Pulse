"use server"

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // Map known Supabase error codes to friendly messages
    let msg = error.message
    if (error.message === 'Email not confirmed') {
      msg = 'Please confirm your email before signing in. Check your inbox (and spam folder).'
    } else if (error.message === 'Invalid login credentials') {
      msg = 'Incorrect email or password. Please try again.'
    } else if (error.message === 'access_denied') {
      msg = 'Access denied. Your email may not be confirmed yet.'
    }
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const headersList = await headers()

  // Determine the current origin dynamically so the confirmation link
  // always points back to the correct host (localhost in dev, real domain in prod)
  const origin =
    headersList.get('origin') ||
    headersList.get('x-forwarded-host') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'

  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  const { data: signupData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Tell Supabase where to redirect after the user clicks the confirm link.
      // This MUST match one of the Redirect URLs in your Supabase dashboard.
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    const msg = encodeURIComponent(error.message || 'Could not create account. Please try again.')
    redirect(`/login?error=${msg}`)
  }

  // identities array is empty when the email is already registered but unconfirmed
  if (signupData?.user && signupData.user.identities?.length === 0) {
    redirect('/login?error=An+account+with+this+email+already+exists.')
  }

  // Email confirmation required — no session yet
  if (signupData?.user && !signupData?.session) {
    redirect(
      `/login?info=${encodeURIComponent(
        `Account created! A confirmation link has been sent to ${email}. Click it to activate your account.`
      )}`
    )
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
