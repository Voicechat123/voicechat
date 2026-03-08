import { useState, useEffect, useRef } from 'react'

/**
 * CallModal - overlay połączenia głosowego
 * Props:
 *   mode: 'calling' | 'incoming' | 'active'
 *   remoteUser: { nickname }
 *   onAnswer: () => void
 *   onDecline: () => void
 *   onEnd: () => void
 *   remoteStream: MediaStream | null
 *   iceState: string
 */
export default function CallModal({
  mode,
  remoteUser,
  onAnswer,
  onDecline,
  onEnd,
  remoteStream,
  iceState,
}) {
  const [muted, setMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)
  const timerRef = useRef(null)

  // Podłącz stream audio do elementu <audio>
  useEffect(() => {
    if (remoteStream && audioRef.current) {
      audioRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Timer czasu rozmowy
  useEffect(() => {
    if (mode === 'active') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [mode])

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const statusText = () => {
    if (mode === 'calling') return 'Dzwonię...'
    if (mode === 'incoming') return 'Połączenie przychodzące'
    if (iceState === 'checking') return 'Łączenie...'
    if (iceState === 'connected' || iceState === 'completed') return formatTime(duration)
    return formatTime(duration)
  }

  const initials = remoteUser?.nickname?.slice(0, 2).toUpperCase() || '??'

  return (
    <div className="overlay">
      {/* Hidden audio element for remote stream */}
      <audio ref={audioRef} autoPlay playsInline />

      <div className="animate-fade-in" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 28,
        padding: '40px 36px',
        width: '100%', maxWidth: 340,
        textAlign: 'center',
      }}>
        {/* Pulsing avatar */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
          {(mode === 'calling' || mode === 'incoming') && (
            <>
              <div style={{
                position: 'absolute', inset: -12, borderRadius: '50%',
                border: '2px solid var(--primary)',
                animation: 'pulse-ring 1.5s ease-out infinite',
                opacity: 0.5,
              }} />
              <div style={{
                position: 'absolute', inset: -6, borderRadius: '50%',
                border: '2px solid var(--primary)',
                animation: 'pulse-ring 1.5s ease-out infinite 0.5s',
                opacity: 0.3,
              }} />
            </>
          )}
          <div className="avatar avatar-lg">{initials}</div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          @{remoteUser?.nickname}
        </h2>

        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 28 }}>
          {statusText()}
        </p>

        {/* Waveform — tylko podczas aktywnego połączenia */}
        {mode === 'active' && (iceState === 'connected' || iceState === 'completed') && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 5, height: 60, marginBottom: 28,
          }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="wave-bar" />
            ))}
          </div>
        )}

        {/* Przyciski */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {mode === 'incoming' && (
            <>
              <CallButton
                onClick={onDecline}
                color="var(--red)"
                icon="📵"
                label="Odrzuć"
              />
              <CallButton
                onClick={onAnswer}
                color="var(--green)"
                icon="📞"
                label="Odbierz"
              />
            </>
          )}

          {(mode === 'calling' || mode === 'active') && (
            <>
              {mode === 'active' && (
                <CallButton
                  onClick={() => setMuted(m => !m)}
                  color={muted ? 'var(--red)' : 'var(--surface-3)'}
                  icon={muted ? '🔇' : '🎙️'}
                  label={muted ? 'Wyciszony' : 'Mikrofon'}
                  small
                />
              )}
              <CallButton
                onClick={onEnd}
                color="var(--red)"
                icon="📵"
                label="Zakończ"
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CallButton({ onClick, color, icon, label, small }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        onClick={onClick}
        style={{
          width: small ? 52 : 64,
          height: small ? 52 : 64,
          borderRadius: '50%',
          background: color,
          border: 'none',
          fontSize: small ? 20 : 24,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s, filter 0.15s',
          boxShadow: `0 4px 20px ${color}55`,
        }}
        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
        onMouseLeave={e => e.currentTarget.style.filter = ''}
      >
        {icon}
      </button>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
        {label}
      </span>
    </div>
  )
}
