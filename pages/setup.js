import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import { NovuMark } from '../components/NovuLogo'

const AVATAR_COLORS = [
  { id: 'purple', grad: 'linear-gradient(135deg,#6c63ff,#a78bfa)' },
  { id: 'teal',   grad: 'linear-gradient(135deg,#00d4ff,#00e5a0)' },
  { id: 'pink',   grad: 'linear-gradient(135deg,#f472b6,#fb7185)' },
  { id: 'orange', grad: 'linear-gradient(135deg,#fb923c,#fbbf24)' },
  { id: 'green',  grad: 'linear-gradient(135deg,#34d399,#10b981)' },
]

export default function SetupPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [nickname, setNickname] = useState('')
  const [avatarColor, setAvatarColor] = useState('purple')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nickAvail, setNickAvail] = useState(null)
  const [checkingNick, setCheckingNick] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/'); return }
      setUser(user); setChecking(false)
    })
  }, [router])

  useEffect(() => {
    if (nickname.length < 3) { setNickAvail(null); return }
    const t = setTimeout(async () => {
      setCheckingNick(true)
      const { data } = await supabase.from('profiles').select('nickname').eq('nickname', nickname.toLowerCase()).single()
      setNickAvail(!data); setCheckingNick(false)
    }, 500)
    return () => clearTimeout(t)
  }, [nickname])

  const handle = async (e) => {
    e.preventDefault()
    const nick = nickname.trim().toLowerCase()
    if (nick.length < 3) { setError('Nick musi mieć min. 3 znaki.'); return }
    if (!/^[a-z0-9_]+$/.test(nick)) { setError('Tylko litery a-z, cyfry i podkreślenia.'); return }
    if (!nickAvail) { setError('Ten nick jest już zajęty.'); return }
    if (showPass && password.length > 0 && password.length < 8) { setError('Hasło musi mieć min. 8 znaków.'); return }
    if (showPass && password !== password2) { setError('Hasła nie są takie same.'); return }
    setLoading(true); setError('')
    const { error: pe } = await supabase.from('profiles').upsert({ id: user.id, email: user.email, nickname: nick, avatar_color: avatarColor })
    if (pe) { setLoading(false); setError(pe.code === '23505' ? 'Nick zajęty.' : pe.message); return }
    if (showPass && password.length >= 8) {
      const { error: pw } = await supabase.auth.updateUser({ password })
      if (pw) { setLoading(false); setError(pw.message); return }
    }
    router.replace('/app')
  }

  if (checking) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>

  const selColor = AVATAR_COLORS.find(c => c.id === avatarColor)
  const ns = (() => {
    if (nickname.length < 3) return null
    if (checkingNick) return { color: 'var(--text-muted)', text: 'Sprawdzanie...' }
    if (nickAvail === true) return { color: 'var(--green)', text: '✓ Wolny' }
    if (nickAvail === false) return { color: 'var(--red)', text: '✗ Zajęty' }
    return null
  })()

  return (
    <>
      <Head>
        <title>Novu — Ustaw profil</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div style={{
        minHeight: '100vh', minHeight: '100dvh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        background: 'radial-gradient(ellipse at 40% 60%, rgba(0,212,255,0.08) 0%, transparent 55%), var(--bg)',
      }}>
        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <NovuMark size={52} />
            </div>
            {/* Preview avatara */}
            <div style={{
              width: 68, height: 68, borderRadius: '50%',
              background: selColor.grad,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: 'white',
              boxShadow: '0 8px 28px rgba(108,99,255,0.3)',
              marginBottom: 12, transition: 'background 0.3s',
            }}>
              {nickname ? nickname.slice(0, 2).toUpperCase() : '?'}
            </div>
            <h1 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Ustaw swój profil</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</p>
          </div>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kolor avatara</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {AVATAR_COLORS.map(c => (
                  <button key={c.id} type="button" onClick={() => setAvatarColor(c.id)} style={{
                    width: 38, height: 38, borderRadius: '50%', background: c.grad, border: 'none',
                    cursor: 'pointer',
                    boxShadow: avatarColor === c.id ? '0 0 0 2px var(--bg), 0 0 0 4px var(--primary)' : 'none',
                    transition: 'box-shadow 0.2s, transform 0.15s',
                    transform: avatarColor === c.id ? 'scale(1.12)' : 'scale(1)',
                  }} />
                ))}
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <input className="input" type="text" placeholder="Nick (np. jan_kowalski)" value={nickname}
                onChange={e => { setNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setError('') }}
                maxLength={24} autoFocus />
              {ns && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: ns.color }}>{ns.text}</span>}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -8 }}>Litery a-z, cyfry, podkreślenia. Min. 3 znaki.</p>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <button type="button" onClick={() => setShowPass(p => !p)} style={{
                width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', color: 'var(--text)', fontFamily: 'Inter,sans-serif', fontSize: 14, fontWeight: 600,
              }}>
                <span>🔑 Ustaw hasło (opcjonalne)</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{showPass ? '▲' : '▼'}</span>
              </button>
              {showPass && (
                <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input className="input" type="password" placeholder="Hasło (min. 8 znaków)" value={password} onChange={e => { setPassword(e.target.value); setError('') }} />
                  <input className="input" type="password" placeholder="Powtórz hasło" value={password2} onChange={e => { setPassword2(e.target.value); setError('') }} />
                </div>
              )}
            </div>

            {error && <div style={{ background: 'rgba(255,92,106,0.1)', border: '1px solid rgba(255,92,106,0.3)', borderRadius: 12, padding: '10px 14px', color: 'var(--red)', fontSize: 14 }}>{error}</div>}

            <button className="btn-primary" type="submit" disabled={loading || !nickAvail}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {loading ? <><div className="spinner" />Zapisywanie...</> : 'Wejdź do Novu →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
