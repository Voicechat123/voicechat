import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'

export default function SetupPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [nicknameAvailable, setNicknameAvailable] = useState(null)
  const [checkingNick, setCheckingNick] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/')
        return
      }
      setUser(user)
      setChecking(false)
    })
  }, [router])

  // Sprawdź dostępność nicku (debounce)
  useEffect(() => {
    if (nickname.length < 3) {
      setNicknameAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setCheckingNick(true)
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname.toLowerCase())
        .single()

      setNicknameAvailable(!data)
      setCheckingNick(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [nickname])

  const handleSetup = async (e) => {
    e.preventDefault()

    const nick = nickname.trim().toLowerCase()

    if (nick.length < 3) {
      setError('Nick musi mieć minimum 3 znaki.')
      return
    }

    if (!/^[a-z0-9_]+$/.test(nick)) {
      setError('Nick może zawierać tylko litery a-z, cyfry i podkreślenia.')
      return
    }

    if (!nicknameAvailable) {
      setError('Ten nick jest już zajęty.')
      return
    }

    setLoading(true)
    setError('')

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      nickname: nick,
    })

    setLoading(false)

    if (upsertError) {
      if (upsertError.code === '23505') {
        setError('Ten nick jest już zajęty. Wybierz inny.')
      } else {
        setError(upsertError.message)
      }
      return
    }

    router.replace('/app')
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  const nickStatus = () => {
    if (nickname.length < 3) return null
    if (checkingNick) return { color: 'var(--text-muted)', text: 'Sprawdzanie...' }
    if (nicknameAvailable === true) return { color: 'var(--green)', text: '✓ Dostępny' }
    if (nicknameAvailable === false) return { color: 'var(--red)', text: '✗ Zajęty' }
    return null
  }

  const status = nickStatus()

  return (
    <>
      <Head><title>VoiceChat — Ustaw swój profil</title></Head>

      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '24px',
        background: 'radial-gradient(ellipse at 40% 60%, rgba(34,211,238,0.08) 0%, transparent 60%), var(--bg)',
      }}>
        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>👋</div>
            <h1 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 26, fontWeight: 800, marginBottom: 8,
            }}>
              Witaj!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
              Zalogowany jako <strong style={{ color: 'var(--text)' }}>{user?.email}</strong>.
              <br />Wybierz swój unikalny nick.
            </p>
          </div>

          <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type="text"
                placeholder="np. jan_kowalski"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  setError('')
                }}
                maxLength={24}
                autoFocus
              />
              {status && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 13, fontWeight: 600,
                  color: status.color,
                }}>
                  {status.text}
                </span>
              )}
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -4 }}>
              Tylko litery a-z, cyfry, podkreślenia. Min. 3 znaki.
            </p>

            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 10, padding: '10px 14px',
                color: 'var(--red)', fontSize: 14,
              }}>
                {error}
              </div>
            )}

            <button
              className="btn-primary"
              type="submit"
              disabled={loading || !nicknameAvailable}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 }}
            >
              {loading ? (
                <><div className="spinner" /> Zapisywanie...</>
              ) : (
                'Zapisz i wejdź do aplikacji →'
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
