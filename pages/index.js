import { useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSendLink = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // Po kliknięciu w link, użytkownik zostanie przekierowany tutaj:
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <>
      <Head>
        <title>VoiceChat — Logowanie</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(ellipse at 60% 20%, rgba(124,106,247,0.12) 0%, transparent 60%), var(--bg)',
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: 'fixed', top: '10%', right: '15%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,106,247,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'fixed', bottom: '15%', left: '10%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 420 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '18px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, marginBottom: 16,
              boxShadow: '0 8px 32px var(--primary-glow)',
            }}>
              🎙️
            </div>
            <h1 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 28, fontWeight: 800,
              color: 'var(--text)', marginBottom: 8,
            }}>
              VoiceChat
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
              Wpisz e-mail, wyślemy Ci link do logowania
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSendLink} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                className="input"
                type="email"
                placeholder="twoj@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />

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
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                {loading ? (
                  <><div className="spinner" /> Wysyłanie...</>
                ) : (
                  '✉️ Wyślij link logowania'
                )}
              </button>

              <p style={{
                textAlign: 'center', fontSize: 13,
                color: 'var(--text-muted)', marginTop: 4,
              }}>
                Bez hasła — logowanie przez e-mail. Bezpieczne i proste.
              </p>
            </form>
          ) : (
            <div className="animate-fade-in" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                Sprawdź skrzynkę!
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6 }}>
                Wysłaliśmy link logowania na{' '}
                <strong style={{ color: 'var(--text)' }}>{email}</strong>.
                <br />Kliknij go, żeby się zalogować.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                style={{
                  marginTop: 20, background: 'none', border: 'none',
                  color: 'var(--primary)', cursor: 'pointer',
                  fontSize: 14, fontFamily: 'Nunito, sans-serif',
                  fontWeight: 600,
                }}
              >
                ← Wróć i zmień e-mail
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
