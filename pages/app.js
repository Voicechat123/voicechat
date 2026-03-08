import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import { VoiceCallManager } from '../lib/webrtc'
import CallModal from '../components/CallModal'

// ─── Utility ────────────────────────────────────────────────────────────────

function Avatar({ nickname, size = 'md' }) {
  const initials = (nickname || '?').slice(0, 2).toUpperCase()
  const s = size === 'lg' ? 56 : 40
  return (
    <div style={{
      width: s, height: s, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: s * 0.35, color: 'white',
      userSelect: 'none',
    }}>
      {initials}
    </div>
  )
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AppPage() {
  const router = useRouter()

  // Auth
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // UI
  const [selectedContact, setSelectedContact] = useState(null)
  const [sidebarTab, setSidebarTab] = useState('chats') // 'chats' | 'search'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  // Messages
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [conversations, setConversations] = useState([]) // {profile, lastMsg}
  const messagesEndRef = useRef(null)

  // Voice call state
  const [callState, setCallState] = useState(null)
  // callState = { mode: 'calling'|'incoming'|'active', remoteUser, remoteStream, iceState }
  const callManagerRef = useRef(null)
  const [incomingSignal, setIncomingSignal] = useState(null)

  // ─── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!prof) { router.replace('/setup'); return }

      setUser(user)
      setProfile(prof)
      setAuthLoading(false)
    })
  }, [router])

  // ─── Load conversations ────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!user) return

    // Pobierz ostatnią wiadomość z każdą osobą
    const { data: msgs } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id,nickname), receiver:profiles!messages_receiver_id_fkey(id,nickname)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!msgs) return

    // Zgrupuj po rozmówcy
    const convMap = new Map()
    for (const msg of msgs) {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      const otherProfile = msg.sender_id === user.id ? msg.receiver : msg.sender
      if (!convMap.has(otherId)) {
        convMap.set(otherId, { profile: otherProfile, lastMsg: msg })
      }
    }
    setConversations(Array.from(convMap.values()))
  }, [user])

  useEffect(() => {
    if (user) loadConversations()
  }, [user, loadConversations])

  // ─── Load messages for selected contact ───────────────────────────────────

  useEffect(() => {
    if (!selectedContact || !user) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.id}),` +
          `and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })

      setMessages(data || [])

      // Oznacz jako przeczytane
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', selectedContact.id)
        .eq('receiver_id', user.id)
        .eq('read', false)
    }

    loadMessages()

    // Realtime subscription for messages
    const channel = supabase
      .channel(`chat:${user.id}:${selectedContact.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new
        const isRelevant =
          (msg.sender_id === user.id && msg.receiver_id === selectedContact.id) ||
          (msg.sender_id === selectedContact.id && msg.receiver_id === user.id)
        if (isRelevant) {
          setMessages(prev => [...prev, msg])
          loadConversations()
        }
      })
      .subscribe()

    return () => channel.unsubscribe()
  }, [selectedContact, user, loadConversations])

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Incoming call listener ────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`incoming:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `callee_id=eq.${user.id}`,
      }, async (payload) => {
        const signal = payload.new

        if (signal.type === 'offer' && !callState) {
          // Incoming call — pobierz profil dzwoniącego
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', signal.caller_id)
            .single()

          setIncomingSignal({ callerId: signal.caller_id, offer: signal.payload })
          setCallState({
            mode: 'incoming',
            remoteUser: callerProfile,
            remoteStream: null,
            iceState: null,
          })
        }
      })
      .subscribe()

    return () => channel.unsubscribe()
  }, [user, callState])

  // ─── Send message ──────────────────────────────────────────────────────────

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMsg.trim() || !selectedContact || !user) return

    setSendingMsg(true)
    const content = newMsg.trim()
    setNewMsg('')

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedContact.id,
      content,
    })

    if (error) {
      setNewMsg(content)
      alert('Błąd wysyłania wiadomości: ' + error.message)
    } else {
      loadConversations()
    }

    setSendingMsg(false)
  }

  // ─── Search users ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('nickname', `%${searchQuery}%`)
        .neq('id', user?.id)
        .limit(10)

      setSearchResults(data || [])
      setSearching(false)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery, user])

  // ─── Voice call — start ────────────────────────────────────────────────────

  const startCall = async (remoteUser) => {
    if (!user) return

    callManagerRef.current = new VoiceCallManager(supabase, user.id)

    callManagerRef.current.onRemoteStream = (stream) => {
      setCallState(prev => ({ ...prev, remoteStream: stream }))
    }
    callManagerRef.current.onCallEnded = () => {
      setCallState(null)
      callManagerRef.current = null
    }
    callManagerRef.current.onIceStateChange = (state) => {
      setCallState(prev => {
        if (!prev) return null
        const mode = (state === 'connected' || state === 'completed') ? 'active' : prev.mode
        return { ...prev, iceState: state, mode }
      })
    }

    setCallState({ mode: 'calling', remoteUser, remoteStream: null, iceState: null })

    try {
      await callManagerRef.current.startCall(remoteUser.id)
    } catch (err) {
      alert(err.message)
      setCallState(null)
      callManagerRef.current = null
    }
  }

  // ─── Voice call — answer ───────────────────────────────────────────────────

  const answerCall = async () => {
    if (!user || !incomingSignal) return

    callManagerRef.current = new VoiceCallManager(supabase, user.id)

    callManagerRef.current.onRemoteStream = (stream) => {
      setCallState(prev => ({ ...prev, remoteStream: stream }))
    }
    callManagerRef.current.onCallEnded = () => {
      setCallState(null)
      callManagerRef.current = null
    }
    callManagerRef.current.onIceStateChange = (state) => {
      setCallState(prev => {
        if (!prev) return null
        const mode = (state === 'connected' || state === 'completed') ? 'active' : prev.mode
        return { ...prev, iceState: state, mode }
      })
    }

    setCallState(prev => ({ ...prev, mode: 'active' }))

    try {
      await callManagerRef.current.answerCall(incomingSignal.callerId, incomingSignal.offer)
      setIncomingSignal(null)
    } catch (err) {
      alert(err.message)
      setCallState(null)
      callManagerRef.current = null
    }
  }

  // ─── Voice call — end ──────────────────────────────────────────────────────

  const endCall = async () => {
    if (callManagerRef.current) {
      const remoteId = callState?.remoteUser?.id || incomingSignal?.callerId
      await callManagerRef.current.endCall(remoteId)
      callManagerRef.current = null
    }
    setCallState(null)
    setIncomingSignal(null)
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  const logout = async () => {
    await endCall()
    await supabase.auth.signOut()
    router.replace('/')
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>VoiceChat</title>
      </Head>

      {/* Call overlay */}
      {callState && (
        <CallModal
          mode={callState.mode}
          remoteUser={callState.remoteUser}
          remoteStream={callState.remoteStream}
          iceState={callState.iceState}
          onAnswer={answerCall}
          onDecline={endCall}
          onEnd={endCall}
        />
      )}

      {/* Main layout */}
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside style={{
          width: 300, flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Mój profil */}
          <div style={{
            padding: '18px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Avatar nickname={profile?.nickname} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: 15, truncate: true }}>
                @{profile?.nickname}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {profile?.email}
              </div>
            </div>
            <button
              onClick={logout}
              title="Wyloguj"
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: 18, padding: 4, borderRadius: 6,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              ⬡
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
          }}>
            {['chats', 'search'].map(tab => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'none', border: 'none',
                  color: sidebarTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 700, fontSize: 13,
                  cursor: 'pointer',
                  borderBottom: `2px solid ${sidebarTab === tab ? 'var(--primary)' : 'transparent'}`,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  transition: 'color 0.2s',
                }}
              >
                {tab === 'chats' ? '💬 Czaty' : '🔍 Szukaj'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {sidebarTab === 'chats' ? (
              <>
                {conversations.length === 0 ? (
                  <div style={{
                    padding: 24, textAlign: 'center',
                    color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7,
                  }}>
                    Brak rozmów.<br />
                    <span
                      onClick={() => setSidebarTab('search')}
                      style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Znajdź kogoś
                    </span>
                    {' '}po nicku i napisz!
                  </div>
                ) : (
                  conversations.map(({ profile: p, lastMsg }) => (
                    <ContactRow
                      key={p.id}
                      profile={p}
                      subtitle={lastMsg?.content}
                      active={selectedContact?.id === p.id}
                      onClick={() => setSelectedContact(p)}
                    />
                  ))
                )}
              </>
            ) : (
              <div style={{ padding: '10px 12px' }}>
                <input
                  className="input"
                  placeholder="Szukaj po nicku..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{ marginBottom: 8 }}
                />
                {searching && (
                  <div style={{ textAlign: 'center', padding: 16 }}>
                    <div className="spinner" style={{ margin: 'auto' }} />
                  </div>
                )}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div style={{ padding: '12px 4px', color: 'var(--text-muted)', fontSize: 14 }}>
                    Nie znaleziono użytkownika „{searchQuery}".
                  </div>
                )}
                {searchResults.map(p => (
                  <ContactRow
                    key={p.id}
                    profile={p}
                    subtitle={p.email}
                    active={selectedContact?.id === p.id}
                    onClick={() => {
                      setSelectedContact(p)
                      setSidebarTab('chats')
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Chat area ───────────────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedContact ? (
            <>
              {/* Chat header */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--surface)',
              }}>
                <Avatar nickname={selectedContact.nickname} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    @{selectedContact.nickname}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {selectedContact.email}
                  </div>
                </div>

                {/* Call button */}
                <button
                  onClick={() => startCall(selectedContact)}
                  disabled={!!callState}
                  title="Zadzwoń"
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: callState ? 'var(--surface-3)' : 'var(--green)',
                    border: 'none', fontSize: 18, cursor: callState ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s, transform 0.1s',
                    opacity: callState ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!callState) e.currentTarget.style.transform = 'scale(1.1)' }}
                  onMouseLeave={e => e.currentTarget.style.transform = ''}
                >
                  📞
                </button>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '20px 20px 10px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {messages.length === 0 && (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'var(--text-muted)',
                    fontSize: 14, flexDirection: 'column', gap: 8, opacity: 0.7,
                  }}>
                    <span style={{ fontSize: 32 }}>👋</span>
                    Napisz pierwszą wiadomość do @{selectedContact.nickname}!
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isOwn = msg.sender_id === user.id
                  const prevMsg = messages[i - 1]
                  const showTime = !prevMsg || (
                    new Date(msg.created_at) - new Date(prevMsg.created_at) > 5 * 60 * 1000
                  )
                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <div style={{
                          textAlign: 'center', fontSize: 11.5,
                          color: 'var(--text-muted)', margin: '8px 0',
                        }}>
                          {formatTime(msg.created_at)}
                        </div>
                      )}
                      <div className={isOwn ? 'msg-out' : 'msg-in'}
                        style={{ animation: 'fadeIn 0.2s ease' }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <form
                onSubmit={sendMessage}
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex', gap: 10, alignItems: 'center',
                  background: 'var(--surface)',
                }}
              >
                <input
                  className="input"
                  placeholder={`Napisz do @${selectedContact.nickname}...`}
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  style={{ flex: 1 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(e)
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMsg.trim() || sendingMsg}
                  style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: newMsg.trim() ? 'var(--primary)' : 'var(--surface-3)',
                    border: 'none', cursor: newMsg.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                    transition: 'background 0.2s, transform 0.1s',
                    boxShadow: newMsg.trim() ? '0 2px 12px var(--primary-glow)' : 'none',
                  }}
                  onMouseEnter={e => { if (newMsg.trim()) e.currentTarget.style.transform = 'scale(1.08)' }}
                  onMouseLeave={e => e.currentTarget.style.transform = ''}
                >
                  {sendingMsg ? <div className="spinner" style={{ width: 16, height: 16 }} /> : '➤'}
                </button>
              </form>
            </>
          ) : (
            // Empty state
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12, color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: 52 }}>🎙️</div>
              <h2 style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: 22, fontWeight: 800, color: 'var(--text)',
              }}>
                VoiceChat
              </h2>
              <p style={{ fontSize: 15, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
                Wybierz rozmowę z listy lub{' '}
                <span
                  onClick={() => setSidebarTab('search')}
                  style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  znajdź użytkownika
                </span>
                {' '}po nicku.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

// ─── Contact row component ──────────────────────────────────────────────────

function ContactRow({ profile, subtitle, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', cursor: 'pointer',
        background: active ? 'var(--surface-3)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--primary)' : 'transparent'}`,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <Avatar nickname={profile?.nickname} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          @{profile?.nickname}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 12.5, color: 'var(--text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: 180,
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}
