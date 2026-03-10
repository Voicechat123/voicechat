-- Wklej w Supabase → SQL Editor → Run
-- Tworzy bucket na zdjecia profilowe + polityki dostępu

-- 1. Utwórz bucket "avatars" (publiczny)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Polityki storage: każdy zalogowany może uploadować/nadpisać swój avatar
CREATE POLICY "avatars_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND name = 'avatars/' || auth.uid() || '.jpg');

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND name = 'avatars/' || auth.uid() || '.jpg');

-- 3. Każdy może czytać avatary (publiczne)
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- 4. Dodaj kolumny do profiles (jeśli jeszcze nie ma)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_color text DEFAULT 'purple',
  ADD COLUMN IF NOT EXISTS avatar_url text;
