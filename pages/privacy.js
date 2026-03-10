import Head from 'next/head'
import Link from 'next/link'

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Polityka prywatności — Novu</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'Inter, sans-serif',
        padding: '40px 20px',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Logo / powrót */}
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            color: 'var(--primary)', textDecoration: 'none',
            fontWeight: 600, fontSize: 14, marginBottom: 40,
          }}>
            ← Wróć do Novu
          </Link>

          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Polityka prywatności</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 40 }}>
            Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <Section title="1. Kim jesteśmy">
            Novu to prywatna aplikacja do komunikacji głosowej i wideo. Aplikacja jest udostępniana bezpłatnie i nie jest prowadzona w celach komercyjnych.
          </Section>

          <Section title="2. Jakie dane zbieramy">
            Podczas korzystania z Novu zbieramy następujące dane:
            <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 2 }}>
              <li>Adres e-mail (podany podczas rejestracji lub logowania przez Google)</li>
              <li>Nazwa użytkownika (nick) — ustawiana przez Ciebie</li>
              <li>Zdjęcie profilowe — jeśli je dodasz</li>
              <li>Treść wiadomości wysyłanych w aplikacji</li>
            </ul>
          </Section>

          <Section title="3. Do czego używamy danych">
            Zbierane dane służą wyłącznie do:
            <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 2 }}>
              <li>Identyfikacji użytkownika i umożliwienia logowania</li>
              <li>Wyświetlania profilu innym użytkownikom aplikacji</li>
              <li>Dostarczania wiadomości do odbiorcy</li>
            </ul>
            Nie sprzedajemy, nie udostępniamy ani nie przetwarzamy danych w celach reklamowych.
          </Section>

          <Section title="4. Logowanie przez Google">
            Jeśli logujesz się przez Google, otrzymujemy od Google Twój adres e-mail oraz imię i nazwisko. Nie otrzymujemy dostępu do Twojego hasła Google ani innych danych z konta Google.
          </Section>

          <Section title="5. Przechowywanie danych">
            Dane przechowywane są na serwerach <strong>Supabase</strong> (Frankfurt, UE) zgodnie z regulaminem tej usługi. Połączenia wideo i głosowe są realizowane bezpośrednio między użytkownikami (P2P) i nie są nagrywane ani przechowywane.
          </Section>

          <Section title="6. Twoje prawa">
            Masz prawo do wglądu, poprawiania oraz usunięcia swoich danych. Aby usunąć konto i wszystkie powiązane dane, skontaktuj się z administratorem aplikacji.
          </Section>

          <Section title="7. Kontakt">
            W przypadku pytań dotyczących prywatności możesz skontaktować się przez aplikację Novu.
          </Section>

        </div>
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>{title}</h2>
      <div style={{ color: 'var(--text-muted)', lineHeight: 1.8, fontSize: 15 }}>{children}</div>
    </div>
  )
}
