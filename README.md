# 🎙️ VoiceChat

Komunikator głosowy z czatem tekstowym. 100% darmowy.

**Stack:**
- **Supabase** — auth (magic link e-mail), baza danych PostgreSQL, Realtime
- **Next.js 14** — frontend
- **Vercel** — hosting (darmowy)
- **WebRTC** — połączenia głosowe P2P (Google STUN, darmowe)

---

## 🚀 Instalacja krok po kroku

### 1. Utwórz projekt Supabase (darmowe)

1. Idź na [supabase.com](https://supabase.com) → **New project**
2. Zapamiętaj region (najlepiej `eu-central-1` dla Polski)
3. Po utworzeniu przejdź do **Settings → API** i skopiuj:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Uruchom schemat bazy danych

1. W Supabase Dashboard idź do **SQL Editor**
2. Wklej całą zawartość pliku `supabase/schema.sql`
3. Kliknij **Run** — to utworzy wszystkie tabele, polityki RLS i indeksy

### 3. Skonfiguruj URL przekierowania (WAŻNE!)

W Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://TWOJA-DOMENA.vercel.app`
- **Redirect URLs:** `https://TWOJA-DOMENA.vercel.app/auth/callback`

> Na etapie developmentu ustaw też: `http://localhost:3000` i `http://localhost:3000/auth/callback`

### 4. Klonuj repo i zainstaluj zależności

```bash
git clone <twoje-repo>
cd voicechat
npm install
```

### 5. Utwórz plik .env.local

```bash
cp .env.example .env.local
```

Wypełnij danymi z Supabase (krok 1):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 6. Uruchom lokalnie

```bash
npm run dev
```

Aplikacja dostępna na: http://localhost:3000

---

## ☁️ Deploy na Vercel (darmowe)

1. Wrzuć kod na GitHub
2. Wejdź na [vercel.com](https://vercel.com) → **New Project** → importuj repo
3. W ustawieniach projektu dodaj zmienne środowiskowe:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Kliknij **Deploy**
5. Wróć do Supabase i uzupełnij URL przekierowania o domenę Vercel (krok 3)

---

## ✨ Jak to działa

### Rejestracja / logowanie
1. Użytkownik wpisuje e-mail
2. Supabase wysyła magic link (bez hasła!)
3. Po kliknięciu w link → `/auth/callback` → sprawdza czy jest profil
4. Jeśli nowy użytkownik → `/setup` → wybór unikalnego nicku
5. Jeśli ma profil → `/app` — gotowe!

### Wiadomości
- Przechowywane w tabeli `messages` w Supabase PostgreSQL
- Live updates przez Supabase Realtime (WebSocket)
- RLS gwarantuje że widzisz tylko swoje wiadomości

### Połączenia głosowe
- WebRTC peer-to-peer — audio idzie bezpośrednio między użytkownikami
- Sygnalizacja (offer/answer/ICE) przez tabelę `call_signals` + Realtime
- STUN serwery Google — darmowe, używane do wykrywania adresu IP

> **Uwaga:** WebRTC działa dla ~85% przypadków bez TURN serwera. Jeśli ktoś jest za
> restrykcyjnym firewallem/NAT, połączenie może nie działać. Dla 100% niezawodności
> można dodać darmowy TURN z [metered.ca](https://www.metered.ca/tools/openrelay/)

---

## 📁 Struktura projektu

```
voicechat/
├── lib/
│   ├── supabaseClient.js    # Klient Supabase
│   └── webrtc.js            # Manager połączeń WebRTC
├── pages/
│   ├── index.js             # Strona logowania (magic link)
│   ├── auth/callback.js     # Obsługa przekierowania po kliknięciu linku
│   ├── setup.js             # Ustawienie nicku (nowi użytkownicy)
│   └── app.js               # Główna aplikacja (czat + połączenia)
├── components/
│   └── CallModal.js         # UI połączenia głosowego
├── styles/
│   └── globals.css          # Style globalne
└── supabase/
    └── schema.sql           # Schemat bazy danych
```

---

## 🛠️ Limity darmowego planu Supabase

| Zasób | Limit free |
|-------|-----------|
| Baza danych | 500 MB |
| Bandwidth | 5 GB / miesiąc |
| Realtime messages | 200 concurrent connections |
| Auth e-maile | 3/godzinę (można zmienić SMTP) |
| Storage | 1 GB |

Dla małego komunikatora (<1000 użytkowników) w zupełności wystarczy.

---

## 💡 Własny SMTP (opcjonalne, dla więcej niż 3 maili/h)

W Supabase → **Authentication → SMTP Settings** podłącz np.:
- **Resend.com** — 100 maili/dzień darmowo
- **Brevo (Sendinblue)** — 300 maili/dzień darmowo
- **Mailgun** — 100 maili/dzień darmowo
