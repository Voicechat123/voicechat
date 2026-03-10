import { useState, useEffect, useRef } from 'react'

const GRAD = {
  purple: 'linear-gradient(135deg,#6c63ff,#a78bfa)',
  teal:   'linear-gradient(135deg,#00d4ff,#00e5a0)',
  pink:   'linear-gradient(135deg,#f472b6,#fb7185)',
  orange: 'linear-gradient(135deg,#fb923c,#fbbf24)',
  green:  'linear-gradient(135deg,#34d399,#10b981)',
}

export default function CallModal({
  mode,           // 'calling' | 'incoming' | 'active'
  remoteUser,
  localStream,
  remoteStream,
  isVideo,
  onAnswer,
  onDecline,
  onEnd,
  onToggleMic,
  onToggleCam,
  micEnabled,
  camEnabled,
}) {
  const [duration, setDuration] = useState(0)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const localVideoRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (mode === 'active') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [mode])

  // Remote stream → video lub audio
  useEffect(() => {
    if (!remoteStream) return
    if (isVideo && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch(() => {})
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream
      remoteAudioRef.current.play().catch(() => {})
    }
  }, [remoteStream, isVideo])

  // Local stream → lokalny podgląd
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play().catch(() => {})
    }
  }, [localStream])

  const fmt = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
  const initials = remoteUser?.nickname?.slice(0,2).toUpperCase() || '??'
  const grad = GRAD[remoteUser?.avatar_color || 'purple']
  const isActive = mode === 'active'
  const showVideo = isVideo && isActive

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: showVideo ? '#000' : 'rgba(0,0,0,0.85)',
      backdropFilter: showVideo ? 'none' : 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Zawsze obecny element audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {showVideo ? (
        /* ── WIDEO FULLSCREEN ── */
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Zdalny wideo — pełny ekran */}
          <video ref={remoteVideoRef} autoPlay playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#111' }} />

          {/* Lokalny — PiP prawy górny */}
          <div style={{
            position: 'absolute', top: 20, right: 20,
            width: 160, height: 120, borderRadius: 14,
            overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)',
            background: '#222', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            <video ref={localVideoRef} autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {!camEnabled && (
              <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📷</div>
            )}
          </div>

          {/* Info lewy górny */}
          <div style={{
            position: 'absolute', top: 20, left: 20,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            borderRadius: 12, padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>@{remoteUser?.nickname}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{fmt(duration)}</span>
          </div>

          {/* Przyciski — dół */}
          <div style={{
            position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 16, alignItems: 'center',
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
            padding: '14px 24px', borderRadius: 48,
          }}>
            <CtrlBtn onClick={onToggleMic} active={!micEnabled} icon={micEnabled ? '🎤' : '🔇'} label="Mikrofon" />
            <CtrlBtn onClick={onToggleCam} active={!camEnabled} icon={camEnabled ? '📹' : '📷'} label="Kamera" />
            <CtrlBtn onClick={onEnd} red icon="📵" label="Zakończ" big />
          </div>
        </div>
      ) : (
        /* ── AUDIO / CALLING / INCOMING ── */
        <div className="animate-fade-in" style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 28, padding: '44px 32px 36px',
          width: '100%', maxWidth: 320, textAlign: 'center',
        }}>
          {/* Avatar z pulsem */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
            {(mode === 'calling' || mode === 'incoming') && <>
              <div style={{ position: 'absolute', inset: -14, borderRadius: '50%', border: '2px solid var(--primary)', animation: 'pulse-ring 1.6s ease-out infinite', opacity: 0.5 }} />
              <div style={{ position: 'absolute', inset: -7, borderRadius: '50%', border: '2px solid var(--primary)', animation: 'pulse-ring 1.6s ease-out infinite 0.6s', opacity: 0.3 }} />
            </>}
            {remoteUser?.avatar_url ? (
              <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden' }}>
                <img src={remoteUser.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'white' }}>{initials}</div>
            )}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>@{remoteUser?.nickname}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 28 }}>
            {mode === 'calling' ? 'Dzwonię...' : mode === 'incoming' ? 'Połączenie przychodzące' : fmt(duration)}
          </p>

          {isActive && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 56, marginBottom: 28 }}>
              {[0,1,2,3,4].map(i => <div key={i} className="wave-bar" />)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            {mode === 'incoming' && <>
              <CtrlBtn onClick={onDecline} red icon="📵" label="Odrzuć" big />
              <CtrlBtn onClick={onAnswer} green icon="📞" label="Odbierz" big />
            </>}
            {mode === 'calling' && <CtrlBtn onClick={onEnd} red icon="📵" label="Anuluj" big />}
            {mode === 'active' && <>
              <CtrlBtn onClick={onToggleMic} active={!micEnabled} icon={micEnabled ? '🎤' : '🔇'} label="Mikrofon" />
              <CtrlBtn onClick={onEnd} red icon="📵" label="Zakończ" big />
            </>}
          </div>
        </div>
      )}
    </div>
  )
}

function CtrlBtn({ onClick, icon, label, red, green, active, big }) {
  const size = big ? 64 : 52
  let bg = 'rgba(255,255,255,0.15)'
  if (red) bg = '#ef4444'
  if (green) bg = '#22c55e'
  if (active) bg = '#ef4444'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button onClick={onClick} style={{
        width: size, height: size, borderRadius: '50%',
        background: bg, border: 'none', fontSize: big ? 24 : 20,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'filter 0.15s, transform 0.15s',
        color: 'white',
      }}
        onMouseEnter={e => { e.currentTarget.style.filter='brightness(1.2)'; e.currentTarget.style.transform='scale(1.05)' }}
        onMouseLeave={e => { e.currentTarget.style.filter=''; e.currentTarget.style.transform='' }}
      >{icon}</button>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{label}</span>
    </div>
  )
}
