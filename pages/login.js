import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { NovuLogoDisplay } from '../components/NovuLogo'

const Err = ({ msg }) => msg ? (
  <div style={{ background: 'rgba(255,92,106,0.1)', border: '1px solid rgba(255,92,106,0.3)', borderRadius: 12, padding: '10px 14px', color: 'var(--red)', fontSize: 14 }}>{msg}</div>
) : null

function GoogleBtn() {
  const [loading, setLoading] = useState(false)
  const handle = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }
  return (
    <button type="button" onClick={handle} disabled={loading} style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      padding: '12px 20px', background: 'var(--surface-2)', border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius)', cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.7 : 1, fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: 'var(--text)',
    }}>
      {loading ? <div className="spinner" style={{ borderTopColor: '#4285f4' }} /> : (
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
      )}
      {loading ? 'Przekierowanie...' : 'Kontynuuj z Google'}
    </button>
  )
}

function Separator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>lub</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

function LoginForm({ onMagic }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass })
    if (error) { setError('Nieprawidłowy e-mail lub hasło.'); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
    router.replace(profile?.nickname ? '/app' : '/setup')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <GoogleBtn />
      <Separator />
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input className="input" type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        <input className="input" type="password" placeholder="Hasło" value={pass} onChange={e => setPass(e.target.value)} required />
        <Err msg={error} />
        <button className="btn-primary" type="submit" disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 2 }}>
          {loading ? <><div className="spinner" />Logowanie...</> : 'Zaloguj się →'}
        </button>
      </form>
      <button type="button" onClick={onMagic}
        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>
        ✉️ Zaloguj się przez link e-mail
      </button>
    </div>
  )
}

function MagicForm({ onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handle = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  if (sent) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>📬</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Sprawdź skrzynkę!</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>Link wysłany na <strong style={{ color: 'var(--text)' }}>{email}</strong></p>
      <button onClick={() => { setSent(false); setEmail('') }}
        style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>
        ← Zmień e-mail
      </button>
    </div>
  )

  return (
    <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Wyślemy jednorazowy link — bez potrzeby hasła.</p>
      <input className="input" type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
      <Err msg={error} />
      <button className="btn-primary" type="submit" disabled={loading}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {loading ? <><div className="spinner" />Wysyłanie...</> : '✉️ Wyślij link'}
      </button>
      <button type="button" onClick={onBack}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>
        ← Wróć
      </button>
    </form>
  )
}

function RegisterForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handle = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).single()
    if (existing) { setError('Ten e-mail jest już zarejestrowany. Użyj zakładki "Zaloguj się".'); setLoading(false); return }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  if (sent) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>📬</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Sprawdź skrzynkę!</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
        Kliknij link na <strong style={{ color: 'var(--text)' }}>{email}</strong> — potem ustawisz nick i opcjonalnie hasło.
      </p>
      <button onClick={() => { setSent(false); setEmail('') }}
        style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>
        ← Zmień e-mail
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <GoogleBtn />
      <Separator />
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Lub podaj e-mail — wyślemy link weryfikacyjny.</p>
        <input className="input" type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <Err msg={error} />
        <button className="btn-primary" type="submit" disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 2 }}>
          {loading ? <><div className="spinner" />Wysyłanie...</> : '✉️ Zarejestruj się przez e-mail'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  const [tab, setTab] = useState('login')
  const [magic, setMagic] = useState(false)

  const tabBtn = (t, label) => (
    <button onClick={() => setTab(t)} style={{
      flex: 1, padding: '11px 0', background: 'none', border: 'none',
      color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
      fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 14,
      cursor: 'pointer', borderBottom: `2px solid ${tab === t ? 'var(--primary)' : 'transparent'}`,
      transition: 'color 0.2s',
    }}>{label}</button>
  )

  return (
    <>
      <Head>
        <title>Logowanie — Novu</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div style={{
        minHeight: '100dvh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        background: 'radial-gradient(ellipse at 60% 10%, rgba(108,99,255,0.15) 0%, transparent 55%), radial-gradient(ellipse at 10% 80%, rgba(0,212,255,0.08) 0%, transparent 50%), var(--bg)',
      }}>
        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 400 }}>
          <NovuLogoDisplay />
          {!magic && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
              {tabBtn('login', 'Zaloguj się')}
              {tabBtn('register', 'Zarejestruj się')}
            </div>
          )}
          {magic
            ? <MagicForm onBack={() => setMagic(false)} />
            : tab === 'login'
              ? <LoginForm onMagic={() => setMagic(true)} />
              : <RegisterForm />
          }
        </div>
      </div>
    </>
  )
}
