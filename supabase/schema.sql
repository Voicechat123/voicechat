-- ============================================================
--  VoiceChat — Schema SQL dla Supabase
--  Wklej to w: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. Tabela profili użytkowników
create table if not exists public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  email      text unique not null,
  nickname   text unique not null,
  created_at timestamptz default now() not null
);

-- 2. Tabela wiadomości
create table if not exists public.messages (
  id          uuid default gen_random_uuid() primary key,
  sender_id   uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content     text not null,
  read        boolean default false,
  created_at  timestamptz default now() not null
);

-- 3. Tabela sygnałów WebRTC (do połączeń głosowych)
create table if not exists public.call_signals (
  id          uuid default gen_random_uuid() primary key,
  caller_id   uuid references public.profiles(id) on delete cascade not null,
  callee_id   uuid references public.profiles(id) on delete cascade not null,
  type        text not null,   -- 'offer' | 'answer' | 'ice-candidate' | 'end'
  payload     jsonb,
  created_at  timestamptz default now() not null
);

-- ============================================================
--  Row Level Security (RLS)
-- ============================================================

alter table public.profiles    enable row level security;
alter table public.messages    enable row level security;
alter table public.call_signals enable row level security;

-- profiles: każdy może czytać, tylko właściciel może pisać
create policy "profiles_select_all"
  on public.profiles for select using (true);

create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- messages: tylko uczestnicy rozmowy mają dostęp
create policy "messages_select_own"
  on public.messages for select using (
    auth.uid() = sender_id or auth.uid() = receiver_id
  );

create policy "messages_insert_own"
  on public.messages for insert with check (auth.uid() = sender_id);

create policy "messages_update_receiver"
  on public.messages for update using (auth.uid() = receiver_id);

-- call_signals: tylko caller i callee mają dostęp
create policy "signals_select_own"
  on public.call_signals for select using (
    auth.uid() = caller_id or auth.uid() = callee_id
  );

create policy "signals_insert_caller"
  on public.call_signals for insert with check (auth.uid() = caller_id);

create policy "signals_delete_own"
  on public.call_signals for delete using (
    auth.uid() = caller_id or auth.uid() = callee_id
  );

-- ============================================================
--  Realtime — włącz dla potrzebnych tabel
-- ============================================================

-- Uruchom poniższe, żeby Realtime działał:
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.call_signals;

-- ============================================================
--  Indeksy (wydajność)
-- ============================================================

create index if not exists messages_sender_idx    on public.messages(sender_id);
create index if not exists messages_receiver_idx  on public.messages(receiver_id);
create index if not exists messages_created_idx   on public.messages(created_at desc);
create index if not exists signals_callee_idx     on public.call_signals(callee_id);
create index if not exists profiles_nickname_idx  on public.profiles(nickname);

-- ============================================================
--  Auto-cleanup starych sygnałów (opcjonalne)
-- ============================================================
-- Usuwa sygnały starsze niż 5 minut (opcjonalnie przez pg_cron)
-- create extension if not exists pg_cron;
-- select cron.schedule('cleanup-signals', '*/5 * * * *',
--   'delete from public.call_signals where created_at < now() - interval ''5 minutes''');
