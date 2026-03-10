import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase automatycznie przetwarza token z URL hash
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        // Token mógł już być w hash — poczekaj chwilę na przetworzenie
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (!retrySession) {
            router.replace('/login')
            return
          }
          await checkProfile(retrySession.user)
        }, 1000)
        return
      }

      await checkProfile(session.user)
    }

    const checkProfile = async (user) => {
      // Sprawdź czy użytkownik ma już profil (nick)
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .single()

      if (!profile || !profile.nickname) {
        // Nowy użytkownik — ustaw nick
        router.replace('/setup')
      } else {
        // Istniejący użytkownik — do aplikacji
        router.replace('/app')
      }
    }

    // Supabase obsługuje hash token automatycznie przez onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await checkProfile(session.user)
        }
      }
    )

    handleCallback()

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <>
      <Head><title>Logowanie...</title></Head>
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
          Weryfikacja tożsamości...
        </p>
      </div>
    </>
  )
}
