-- ============================================================
--  Novu v2 — Aktualizacja schematu
--  Wklej w Supabase SQL Editor i kliknij Run
-- ============================================================

-- Dodaj kolumnę avatar_url do profiles (jeśli nie istnieje)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- ============================================================
--  Storage bucket na avatary
-- ============================================================

-- Utwórz bucket "avatars" (publiczny)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Polityki storage — każdy może czytać
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Tylko właściciel może wgrywać/nadpisywać
CREATE POLICY "avatars_owner_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Polityka update profilu (nick + avatar)
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
