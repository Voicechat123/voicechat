import Head from 'next/head'
import Link from 'next/link'
import { NovuMark, NovuWordmark } from '../components/NovuLogo'

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Novu — Komunikator głosowy i wideo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Novu to prywatny komunikator do rozmów głosowych i wideo ze znajomymi. Darmowy, bez reklam." />
      </Head>

      <div style={{
        minHeight: '100dvh',
        background: 'radial-gradient(ellipse at 60% 10%, rgba(108,99,255,0.15) 0%, transparent 55%), radial-gradient(ellipse at 10% 80%, rgba(0,212,255,0.08) 0%, transparent 50%), var(--bg)',
        fontFamily: 'Inter, sans-serif',
        color: 'var(--text)',
      }}>

        {/* Nav */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NovuMark size={32} />
            <NovuWordmark height={20} />
          </div>
          <Link href="/login" style={{
            background: 'var(--primary)',
            color: 'white',
            padding: '10px 22px',
            borderRadius: 'var(--radius)',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 14,
          }}>
            Zaloguj się
          </Link>
        </nav>

        {/* Hero */}
        <div style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '80px 32px 60px',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(108,99,255,0.12)',
            border: '1px solid rgba(108,99,255,0.3)',
            borderRadius: 20,
            padding: '6px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--primary)',
            marginBottom: 28,
          }}>
            🔒 Prywatny komunikator
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 24,
            background: 'linear-gradient(135deg, var(--text) 0%, rgba(108,99,255,0.9) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Rozmawiaj ze znajomymi.<br />Bez kompromisów.
          </h1>

          <p style={{
            fontSize: 18,
            color: 'var(--text-muted)',
            lineHeight: 1.7,
            maxWidth: 480,
            margin: '0 auto 40px',
          }}>
            Novu to darmowy komunikator do rozmów głosowych i wideo. Żadnych reklam, żadnego śledzenia.
          </p>

          <Link href="/login" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--primary)',
            color: 'white',
            padding: '16px 36px',
            borderRadius: 'var(--radius)',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 16,
            boxShadow: '0 4px 32px rgba(108,99,255,0.35)',
          }}>
            Zacznij teraz — to darmowe →
          </Link>
        </div>

        {/* Features */}
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 32px 80px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
        }}>
          {[
            { icon: '🎙️', title: 'Rozmowy głosowe', desc: 'Krystalicznie czysty dźwięk z redukcją szumów.' },
            { icon: '📹', title: 'Wideo HD', desc: 'Połączenia wideo bezpośrednio między urządzeniami (P2P).' },
            { icon: '💬', title: 'Czat', desc: 'Wiadomości tekstowe w czasie rzeczywistym.' },
            { icon: '🔒', title: 'Prywatność', desc: 'Brak reklam, brak śledzenia, brak zbędnych danych.' },
          ].map(f => (
            <div key={f.title} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '28px 24px',
            }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>© {new Date().getFullYear()} Novu</span>
          <Link href="/privacy" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
            Polityka prywatności
          </Link>
        </footer>
      </div>
    </>
  )
}
