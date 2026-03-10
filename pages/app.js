import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import { createPeer, getMedia } from '../lib/peerCall'
import CallModal from '../components/CallModal'
import AvatarUpload from '../components/AvatarUpload'
import { NovuMark, NovuWordmark } from '../components/NovuLogo'

// ── Constants ─────────────────────────────────────────────────────────────────
const GRAD = {
  purple: 'linear-gradient(135deg,#6c63ff,#a78bfa)',
  teal:   'linear-gradient(135deg,#00d4ff,#00e5a0)',
  pink:   'linear-gradient(135deg,#f472b6,#fb7185)',
  orange: 'linear-gradient(135deg,#fb923c,#fbbf24)',
  green:  'linear-gradient(135deg,#34d399,#10b981)',
}
const AVATAR_COLORS = [
  { id: 'purple', grad: GRAD.purple },
  { id: 'teal',   grad: GRAD.teal },
  { id: 'pink',   grad: GRAD.pink },
  { id: 'orange', grad: GRAD.orange },
  { id: 'green',  grad: GRAD.green },
]

// ── Avatar display (nie upload) ──────────────────────────────────────────────
function Avatar({ profile, size = 40 }) {
  const initials = (profile?.nickname || '?').slice(0, 2).toUpperCase()
  if (profile?.avatar_url) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
        <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: GRAD[profile?.avatar_color || 'purple'],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.34, color: 'white', userSelect: 'none',
    }}>{initials}</div>
  )
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

// ── Profile Modal ─────────────────────────────────────────────────────────────
function ProfileModal({ user, profile, onClose, onProfileUpdated }) {
  const [localProfile, setLocalProfile] = useState(profile)
  const [nickname, setNickname] = useState(profile?.nickname || '')
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color || 'purple')

  // Zmiana hasła
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [newPass2, setNewPass2] = useState('')
  const [showPass, setShowPass] = useState(false)
  // Czy użytkownik ma już ustawione hasło?
  const [hasPassword, setHasPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    // Sprawdź czy użytkownik zalogował się kiedyś hasłem (ma provider 'email' z hasłem)
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      const identities = u?.identities || []
      const emailIdentity = identities.find(i => i.provider === 'email')
      // Jeśli identity ma identity_data.email_verified i was created with password
      // Sprawdzamy przez próbę — jeśli user.app_metadata.provider === 'email' i nie jest tylko OTP
      const provider = u?.app_metadata?.provider
      const providers = u?.app_metadata?.providers || []
      // Magic link users mają tylko 'email' provider ale bez hasła
      // Najprostszy sposób: sprawdź czy użytkownik ma last_sign_in z hasłem
      // Zamiast tego — użyj flagi z profilu jeśli istnieje, albo sprawdź przez signIn
      // Najprościej: sprawdź czy profile.has_password === true (kolumna w DB)
      // Fallback: zakładamy że nie ma hasła (bezpieczniejsze)
      setHasPassword(u?.user_metadata?.has_password === true)
    })
  }, [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [nickAvail, setNickAvail] = useState(true)
  const [checkingNick, setCheckingNick] = useState(false)

  useEffect(() => {
    if (nickname.length < 3 || nickname === profile?.nickname) { setNickAvail(true); return }
    const t = setTimeout(async () => {
      setCheckingNick(true)
      const { data } = await supabase.from('profiles').select('nickname').eq('nickname', nickname.toLowerCase()).single()
      setNickAvail(!data); setCheckingNick(false)
    }, 500)
    return () => clearTimeout(t)
  }, [nickname, profile?.nickname])

  const handleSave = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (nickname.length < 3) { setError('Nick min. 3 znaki.'); return }
    if (!nickAvail && nickname !== profile?.nickname) { setError('Ten nick jest zajęty.'); return }

    // Walidacja zmiany hasła
    if (showPass && newPass.length > 0) {
      if (hasPassword && !oldPass) { setError('Podaj stare hasło.'); return }
      if (newPass.length < 8) { setError('Nowe hasło min. 8 znaków.'); return }
      if (newPass !== newPass2) { setError('Nowe hasła nie są takie same.'); return }
    }

    setLoading(true)

    if (showPass && newPass.length >= 8) {
      // Użytkownik ma hasło — weryfikuj stare
      if (hasPassword && oldPass) {
        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: oldPass,
        })
        if (verifyErr) {
          setLoading(false)
          setError('Stare hasło jest nieprawidłowe.')
          return
        }
      }
      // Ustaw nowe hasło
      const { error: pwErr } = await supabase.auth.updateUser({
        password: newPass,
        data: { has_password: true },
      })
      if (pwErr) { setLoading(false); setError(pwErr.message); return }
      setHasPassword(true)
    }

    // Zaktualizuj profil
    const { error: pe } = await supabase.from('profiles')
      .update({ nickname: nickname.toLowerCase(), avatar_color: avatarColor })
      .eq('id', user.id)
    if (pe) { setLoading(false); setError(pe.message); return }

    setLoading(false)
    setSuccess('Zapisano!')
    setOldPass(''); setNewPass(''); setNewPass2('')
    const updated = { ...localProfile, nickname: nickname.toLowerCase(), avatar_color: avatarColor }
    setLocalProfile(updated)
    onProfileUpdated(updated)
  }

  const ns = (() => {
    if (nickname === profile?.nickname || nickname.length < 3) return null
    if (checkingNick) return { color: 'var(--text-muted)', text: 'Sprawdzanie...' }
    if (nickAvail) return { color: 'var(--green)', text: '✓ Wolny' }
    return { color: 'var(--red)', text: '✗ Zajęty' }
  })()

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="animate-fade-in" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 400,
        maxHeight: '92dvh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 20, fontWeight: 800 }}>Mój profil</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {/* Avatar upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 10 }}>
          <AvatarUpload
            userId={user.id}
            currentAvatarUrl={localProfile?.avatar_url}
            nickname={nickname}
            avatarColor={avatarColor}
            size={88}
            onUploadDone={(url) => {
              const updated = { ...localProfile, avatar_url: url }
              setLocalProfile(updated)
              onProfileUpdated(updated)
            }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Kliknij aby zmienić zdjęcie</p>
          <div style={{ fontWeight: 700, fontSize: 15 }}>@{nickname}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Kolor fallback */}
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kolor avatara (gdy brak zdjęcia)</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {AVATAR_COLORS.map(c => (
                <button key={c.id} type="button" onClick={() => setAvatarColor(c.id)} style={{
                  width: 34, height: 34, borderRadius: '50%', background: c.grad, border: 'none',
                  cursor: 'pointer',
                  boxShadow: avatarColor === c.id ? '0 0 0 2px var(--bg), 0 0 0 4px var(--primary)' : 'none',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                  transform: avatarColor === c.id ? 'scale(1.12)' : 'scale(1)',
                }} />
              ))}
            </div>
          </div>

          {/* Nick */}
          <div style={{ position: 'relative' }}>
            <input className="input" type="text" placeholder="Nick" value={nickname}
              onChange={e => { setNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setError(''); setSuccess('') }}
              maxLength={24} />
            {ns && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: ns.color }}>{ns.text}</span>}
          </div>

          {/* Zmiana hasła */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <button type="button" onClick={() => setShowPass(p => !p)} style={{
              width: '100%', padding: '12px 16px', background: 'none', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', color: 'var(--text)', fontFamily: 'Inter,sans-serif', fontSize: 14, fontWeight: 600,
            }}>
              <span>🔑 Zmień hasło</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{showPass ? '▲' : '▼'}</span>
            </button>
            {showPass && (
              <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!hasPassword && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px' }}>
                    Ustaw hasło aby logować się szybciej — bez czekania na e-mail.
                  </p>
                )}
                {hasPassword && (
                  <input className="input" type="password" placeholder="Stare hasło" value={oldPass}
                    onChange={e => { setOldPass(e.target.value); setError(''); setSuccess('') }} />
                )}
                <input className="input" type="password" placeholder={hasPassword ? 'Nowe hasło (min. 8 znaków)' : 'Hasło (min. 8 znaków)'} value={newPass}
                  onChange={e => { setNewPass(e.target.value); setError(''); setSuccess('') }} />
                <input className="input" type="password" placeholder="Powtórz hasło" value={newPass2}
                  onChange={e => { setNewPass2(e.target.value); setError(''); setSuccess('') }} />
              </div>
            )}
          </div>

          {error && <div style={{ background: 'rgba(255,92,106,0.1)', border: '1px solid rgba(255,92,106,0.3)', borderRadius: 12, padding: '10px 14px', color: 'var(--red)', fontSize: 13 }}>{error}</div>}
          {success && <div style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: 12, padding: '10px 14px', color: 'var(--green)', fontSize: 13 }}>✓ {success}</div>}

          <button className="btn-primary" type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {loading ? <><div className="spinner" />Zapisywanie...</> : 'Zapisz zmiany'}
          </button>
        </form>

        {/* ── Strefa niebezpieczna ── */}
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <p style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            ⚠️ Strefa niebezpieczna
          </p>
          {!showDeleteConfirm ? (
            <button type="button" onClick={() => setShowDeleteConfirm(true)} style={{
              width: '100%', padding: '11px 16px',
              background: 'rgba(255,92,106,0.08)', border: '1px solid rgba(255,92,106,0.3)',
              borderRadius: 'var(--radius)', color: 'var(--red)',
              fontFamily: 'Inter,sans-serif', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,92,106,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,92,106,0.08)'}
            >
              🗑️ Usuń konto
            </button>
          ) : (
            <div style={{ background: 'rgba(255,92,106,0.08)', border: '1px solid rgba(255,92,106,0.3)', borderRadius: 14, padding: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>Na pewno chcesz usunąć konto?</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                Wszystkie Twoje dane, wiadomości i profil zostaną trwale usunięte. Tej operacji nie można cofnąć.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowDeleteConfirm(false)} style={{
                  flex: 1, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text)', fontFamily: 'Inter,sans-serif',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  Anuluj
                </button>
                <button type="button" disabled={deleteLoading} onClick={async () => {
                  setDeleteLoading(true)
                  // Usuń dane użytkownika
                  await supabase.from('messages').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                  await supabase.from('call_signals').delete().or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
                  await supabase.from('profiles').delete().eq('id', user.id)
                  // Wywołaj RPC żeby usunąć z auth.users
                  await supabase.rpc('delete_user').catch(() => {})
                  // Wyczyść sesję ręcznie (signOut może rzucić błąd gdy user już nie istnieje)
                  Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k) })
                  window.location.href = '/login'
                }} style={{
                  flex: 1, padding: '10px', background: 'var(--red)', border: 'none',
                  borderRadius: 'var(--radius)', color: 'white', fontFamily: 'Inter,sans-serif',
                  fontSize: 14, fontWeight: 700, cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  opacity: deleteLoading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {deleteLoading ? <><div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: 16, height: 16 }} />Usuwanie...</> : '🗑️ Tak, usuń'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Contact Row ───────────────────────────────────────────────────────────────
function ContactRow({ profile: p, subtitle, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      cursor: 'pointer', background: active ? 'var(--surface-3)' : 'transparent',
      borderLeft: `3px solid ${active ? 'var(--primary)' : 'transparent'}`, transition: 'background 0.15s',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <Avatar profile={p} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>@{p?.nickname}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 185 }}>{subtitle}</div>}
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function AppPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [mobileView, setMobileView] = useState('list')
  const [selectedContact, setSelectedContact] = useState(null)
  const [sidebarTab, setSidebarTab] = useState('chats')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [conversations, setConversations] = useState([])
  const messagesEndRef = useRef(null)
  const [callState, setCallState] = useState(null)
  const peerRef = useRef(null)
  const currentCallRef = useRef(null)
  const localStreamRef = useRef(null)
  const [micEnabled, setMicEnabled] = useState(true)
  const [camEnabled, setCamEnabled] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.replace('/setup'); return }
      setUser(user); setProfile(prof); setAuthLoading(false)
    })
  }, [router])

  const loadConversations = useCallback(async () => {
    if (!user) return
    const { data: msgs } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*), receiver:profiles!messages_receiver_id_fkey(*)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    if (!msgs) return
    const map = new Map()
    for (const msg of msgs) {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      const otherProfile = msg.sender_id === user.id ? msg.receiver : msg.sender
      if (!map.has(otherId)) map.set(otherId, { profile: otherProfile, lastMsg: msg })
    }
    setConversations(Array.from(map.values()))
  }, [user])

  useEffect(() => { if (user) loadConversations() }, [user, loadConversations])

  useEffect(() => {
    if (!selectedContact || !user) return
    const load = async () => {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
      setMessages(data || [])
      await supabase.from('messages').update({ read: true }).eq('sender_id', selectedContact.id).eq('receiver_id', user.id).eq('read', false)
    }
    load()
    const ch = supabase.channel(`chat:${user.id}:${selectedContact.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        if ((msg.sender_id === user.id && msg.receiver_id === selectedContact.id) ||
            (msg.sender_id === selectedContact.id && msg.receiver_id === user.id)) {
          setMessages(prev => [...prev, msg]); loadConversations()
        }
      }).subscribe()
    return () => ch.unsubscribe()
  }, [selectedContact, user, loadConversations])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Nasłuchuj przychodzących wywołań przez Supabase
  useEffect(() => {
    if (!user || !profile) return

    // Utwórz PeerJS peer z ID opartym o user.id (skróconym)
    const peerId = 'novu_' + user.id.replace(/-/g, '').slice(0, 16)

    const peer = createPeer(peerId)
    peerRef.current = peer

    peer.on('open', () => {
      console.log('[PeerJS] Ready, peer ID:', peerId)
    })

    peer.on('call', async (call) => {
      // Przychodzące połączenie
      const callerId = call.metadata?.userId
      if (!callerId) { call.close(); return }

      const { data: callerProfile } = await supabase.from('profiles').select('*').eq('id', callerId).single()
      const isVideo = call.metadata?.withVideo || false

      setCallState({
        mode: 'incoming',
        remoteUser: callerProfile,
        remoteStream: null,
        localStream: null,
        isVideo,
        _call: call,
      })
    })

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Spróbuj z innym ID
        console.warn('[PeerJS] ID unavailable, reconnecting...')
      }
      console.error('[PeerJS] Error:', err)
    })

    peer.on('disconnected', () => {
      setTimeout(() => { if (peerRef.current && !peerRef.current.destroyed) peerRef.current.reconnect() }, 2000)
    })

    return () => {
      peer.destroy()
      peerRef.current = null
    }
  }, [user, profile])

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase.from('profiles').select('*').ilike('nickname', `%${searchQuery}%`).neq('id', user?.id).limit(10)
      setSearchResults(data || []); setSearching(false)
    }, 400)
    return () => clearTimeout(t)
  }, [searchQuery, user])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMsg.trim() || !selectedContact || !user) return
    const content = newMsg.trim(); setNewMsg('')
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: selectedContact.id, content })
    if (error) { setNewMsg(content); alert('Błąd: ' + error.message) }
    else loadConversations()
  }

  const startCall = async (remoteUser, withVideo = false) => {
    if (!user || !peerRef.current) return
    try {
      const stream = await getMedia(withVideo)
      localStreamRef.current = stream
      setMicEnabled(true); setCamEnabled(true)

      const remotePeerId = 'novu_' + remoteUser.id.replace(/-/g, '').slice(0, 16)
      const call = peerRef.current.call(remotePeerId, stream, {
        metadata: { userId: user.id, withVideo }
      })
      currentCallRef.current = call

      setCallState({ mode: 'calling', remoteUser, remoteStream: null, localStream: stream, isVideo: withVideo })

      call.on('stream', (remoteStream) => {
        setCallState(prev => prev ? { ...prev, mode: 'active', remoteStream } : null)
      })
      call.on('close', () => {
        localStreamRef.current?.getTracks().forEach(t => t.stop())
        localStreamRef.current = null
        currentCallRef.current = null
        setCallState(null)
      })
      call.on('error', (err) => {
        console.error('[Call] error:', err)
        endCall()
      })
    } catch (err) {
      alert(err.message)
      setCallState(null)
    }
  }

  const answerCall = async () => {
    const call = callState?._call
    if (!call) return
    try {
      const stream = await getMedia(callState.isVideo)
      localStreamRef.current = stream
      setMicEnabled(true); setCamEnabled(true)

      call.answer(stream)
      currentCallRef.current = call

      setCallState(prev => ({ ...prev, mode: 'active', localStream: stream, _call: undefined }))

      call.on('stream', (remoteStream) => {
        setCallState(prev => prev ? { ...prev, remoteStream } : null)
      })
      call.on('close', () => {
        localStreamRef.current?.getTracks().forEach(t => t.stop())
        localStreamRef.current = null
        currentCallRef.current = null
        setCallState(null)
      })
    } catch (err) {
      alert(err.message)
      setCallState(null)
    }
  }

  const endCall = () => {
    currentCallRef.current?.close()
    currentCallRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    setCallState(null)
    setMicEnabled(true); setCamEnabled(true)
  }

  const toggleMic = () => {
    if (!localStreamRef.current) return
    const enabled = !micEnabled
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = enabled })
    setMicEnabled(enabled)
  }

  const toggleCam = () => {
    if (!localStreamRef.current) return
    const enabled = !camEnabled
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = enabled })
    setCamEnabled(enabled)
  }

  const logout = async () => { await endCall(); await supabase.auth.signOut(); router.replace('/login') }
  const selectContact = (p) => { setSelectedContact(p); if (isMobile) setMobileView('chat') }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const SidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100%' }}>
      {!isMobile && (
        <>
          <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <NovuMark size={32} />
            <NovuWordmark height={20} />
          </div>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {['chats','search'].map(t => (
              <button key={t} onClick={() => setSidebarTab(t)} style={{
                flex: 1, padding: '10px 0', background: 'none', border: 'none',
                color: sidebarTab === t ? 'var(--primary)' : 'var(--text-muted)',
                fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 12,
                cursor: 'pointer', borderBottom: `2px solid ${sidebarTab === t ? 'var(--primary)' : 'transparent'}`,
                textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.2s',
              }}>
                {t === 'chats' ? '💬 Czaty' : '🔍 Szukaj'}
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {(sidebarTab === 'chats' || isMobile) ? (
          <>
            {isMobile && (
              <div style={{ padding: '10px 12px' }}>
                <input className="input" placeholder="Szukaj po nicku..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} style={{ fontSize: 14 }} />
              </div>
            )}
            {searchQuery.length >= 2 ? (
              <>
                {searching && <div style={{ textAlign: 'center', padding: 16 }}><div className="spinner" style={{ margin: 'auto' }} /></div>}
                {!searching && searchResults.length === 0 && <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 14 }}>Nie znaleziono.</div>}
                {searchResults.map(p => (
                  <ContactRow key={p.id} profile={p} subtitle={p.email} active={selectedContact?.id === p.id}
                    onClick={() => { selectContact(p); setSearchQuery('') }} />
                ))}
              </>
            ) : (
              <>
                {conversations.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
                    Brak rozmów.<br />
                    <span onClick={() => setSidebarTab('search')} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>Znajdź kogoś</span> po nicku!
                  </div>
                )}
                {conversations.map(({ profile: p, lastMsg }) => (
                  <ContactRow key={p.id} profile={p} subtitle={lastMsg?.content} active={selectedContact?.id === p.id} onClick={() => selectContact(p)} />
                ))}
              </>
            )}
          </>
        ) : (
          <div style={{ padding: '10px 12px' }}>
            <input className="input" placeholder="Szukaj po nicku..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} autoFocus style={{ marginBottom: 8 }} />
            {searching && <div style={{ textAlign: 'center', padding: 16 }}><div className="spinner" style={{ margin: 'auto' }} /></div>}
            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && <div style={{ padding: '12px 4px', color: 'var(--text-muted)', fontSize: 14 }}>Nie znaleziono „{searchQuery}".</div>}
            {searchResults.map(p => (
              <ContactRow key={p.id} profile={p} subtitle={p.email} active={selectedContact?.id === p.id}
                onClick={() => { selectContact(p); setSidebarTab('chats'); setSearchQuery(''); setSearchResults([]) }} />
            ))}
          </div>
        )}
      </div>

      {!isMobile && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setShowProfile(true)} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10,
              background: 'none', border: 'none', borderRadius: 12, padding: '8px 10px',
              cursor: 'pointer', transition: 'background 0.15s', textAlign: 'left',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Avatar profile={profile} size={34} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>@{profile?.nickname}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Profil i ustawienia</div>
              </div>
            </button>
            <button onClick={logout} title="Wyloguj" style={{
              background: 'none', border: 'none', borderRadius: 10, padding: '8px',
              cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, transition: 'color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >🚪</button>
          </div>
        </div>
      )}
    </div>
  )

  // ── Chat view ────────────────────────────────────────────────────────────────
  const ChatView = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {selectedContact ? (
        <>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', flexShrink: 0 }}>
            {isMobile && (
              <button onClick={() => { setMobileView('list'); setSelectedContact(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, padding: '0 4px 0 0' }}>←</button>
            )}
            <Avatar profile={selectedContact} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>@{selectedContact.nickname}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedContact.email}</div>
            </div>
            <button onClick={() => startCall(selectedContact, false)} disabled={!!callState} title="Głos" style={{ width: 38, height: 38, borderRadius: '50%', background: callState ? 'var(--surface-3)' : 'rgba(0,229,160,0.15)', border: 'none', fontSize: 17, cursor: callState ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: callState ? 0.4 : 1 }}>🎙️</button>
            <button onClick={() => startCall(selectedContact, true)} disabled={!!callState} title="Wideo" style={{ width: 38, height: 38, borderRadius: '50%', background: callState ? 'var(--surface-3)' : 'rgba(108,99,255,0.15)', border: 'none', fontSize: 17, cursor: callState ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: callState ? 0.4 : 1 }}>📹</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14, gap: 8 }}>
                <span style={{ fontSize: 32 }}>👋</span>Napisz pierwszą wiadomość!
              </div>
            )}
            {messages.map((msg, i) => {
              const isOwn = msg.sender_id === user.id
              const prev = messages[i - 1]
              const showTime = !prev || new Date(msg.created_at) - new Date(prev.created_at) > 5 * 60 * 1000
              return (
                <div key={msg.id}>
                  {showTime && <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', margin: '8px 0' }}>{formatTime(msg.created_at)}</div>}
                  <div className={isOwn ? 'msg-out' : 'msg-in'}>{msg.content}</div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--surface)', flexShrink: 0 }}>
            <input className="input" placeholder={`Napisz do @${selectedContact.nickname}...`} value={newMsg}
              onChange={e => setNewMsg(e.target.value)} style={{ flex: 1, fontSize: 14, padding: '11px 14px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }} />
            <button type="submit" disabled={!newMsg.trim()} style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0, border: 'none',
              background: newMsg.trim() ? 'var(--primary)' : 'var(--surface-3)',
              cursor: newMsg.trim() ? 'pointer' : 'default', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
            }}>➤</button>
          </form>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <NovuMark size={56} />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Witaj w Novu</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 240, lineHeight: 1.6 }}>
              Wybierz rozmowę lub{' '}
              <span onClick={() => setSidebarTab('search')} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>znajdź użytkownika</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <Head>
        <title>Novu</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {callState && (
        <CallModal
          mode={callState.mode}
          remoteUser={callState.remoteUser}
          remoteStream={callState.remoteStream}
          localStream={callState.localStream}
          isVideo={callState.isVideo}
          micEnabled={micEnabled}
          camEnabled={camEnabled}
          onAnswer={answerCall}
          onDecline={endCall}
          onEnd={endCall}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
        />
      )}

      {showProfile && (
        <ProfileModal user={user} profile={profile} onClose={() => setShowProfile(false)}
          onProfileUpdated={(updated) => { setProfile(updated) }} />
      )}

      {/* Desktop */}
      {!isMobile && (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <aside style={{ width: 280, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {SidebarContent}
          </aside>
          {ChatView}
        </div>
      )}

      {/* Mobile */}
      {isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
          <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <NovuMark size={28} />
              <NovuWordmark height={18} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowProfile(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <Avatar profile={profile} size={32} />
              </button>
              <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>🚪</button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {mobileView === 'list' ? (
              <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface)' }}>{SidebarContent}</div>
            ) : ChatView}
          </div>
        </div>
      )}
    </>
  )
}
