// Novu logo — piękne SVG z geometrycznym znakiem N

export function NovuMark({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nm_a" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B7FFF"/>
          <stop offset="100%" stopColor="#00D4FF"/>
        </linearGradient>
        <linearGradient id="nm_b" x1="44" y1="4" x2="4" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B7FFF" stopOpacity="0.15"/>
          <stop offset="50%" stopColor="#00D4FF" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#8B7FFF" stopOpacity="0.05"/>
        </linearGradient>
        <filter id="nm_glow">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* Tło — ośmiokąt */}
      <path
        d="M16 4 L32 4 L44 16 L44 32 L32 44 L16 44 L4 32 L4 16 Z"
        fill="url(#nm_b)"
        stroke="url(#nm_a)"
        strokeWidth="1"
        opacity="0.7"
      />

      {/* Wewnętrzny ośmiokąt (cieńszy) */}
      <path
        d="M18 9 L30 9 L39 18 L39 30 L30 39 L18 39 L9 30 L9 18 Z"
        fill="none"
        stroke="url(#nm_a)"
        strokeWidth="0.5"
        opacity="0.3"
      />

      {/* Litera N — główny element */}
      <path
        d="M15 33 L15 15 L25.5 29 L25.5 15"
        stroke="url(#nm_a)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#nm_glow)"
      />
      <path
        d="M25.5 15 L33 15 L33 33"
        stroke="url(#nm_a)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#nm_glow)"
      />

      {/* Akcenty — małe kółka na rogach */}
      <circle cx="16" cy="4" r="1.8" fill="#8B7FFF" opacity="0.8"/>
      <circle cx="32" cy="4" r="1.8" fill="#00D4FF" opacity="0.6"/>
      <circle cx="44" cy="16" r="1.8" fill="#8B7FFF" opacity="0.5"/>
      <circle cx="4" cy="32" r="1.8" fill="#00D4FF" opacity="0.5"/>
      <circle cx="44" cy="32" r="1.2" fill="#8B7FFF" opacity="0.3"/>
      <circle cx="4" cy="16" r="1.2" fill="#00D4FF" opacity="0.3"/>
    </svg>
  )
}

export function NovuWordmark({ height = 24 }) {
  // Czysty wordmark SVG — "novu" z gradientem
  return (
    <svg height={height} viewBox="0 0 80 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wm_g" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF"/>
          <stop offset="60%" stopColor="#C8C4FF"/>
          <stop offset="100%" stopColor="#80DAFF"/>
        </linearGradient>
      </defs>
      {/* N */}
      <path d="M2 20V4L12 16V4" stroke="url(#wm_g)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* O */}
      <ellipse cx="26" cy="12" rx="6" ry="8" stroke="url(#wm_g)" strokeWidth="2.2" fill="none"/>
      {/* V */}
      <path d="M36 4L42 20L48 4" stroke="url(#wm_g)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* U */}
      <path d="M52 4V15C52 18.3 54.2 20 57 20C59.8 20 62 18.3 62 15V4" stroke="url(#wm_g)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  )
}

// Logo pełne — mark + wordmark
export function NovuLogoFull({ markSize = 40, wordHeight = 22 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <NovuMark size={markSize} />
      <NovuWordmark height={wordHeight} />
    </div>
  )
}

// Logo z opisem — do stron logowania
export function NovuLogoDisplay() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      {/* Tło z poświatą */}
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
        <div style={{
          position: 'absolute', inset: -16,
          background: 'radial-gradient(circle, rgba(108,99,255,0.25) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
        <NovuMark size={72} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <NovuWordmark height={30} />
      </div>
      <p style={{
        color: 'var(--text-muted)', fontSize: 13,
        letterSpacing: '0.02em',
      }}>
        Komunikuj się. Rozmawiaj. Bądź blisko.
      </p>
    </div>
  )
}
