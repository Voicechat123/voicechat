-- Uruchom w Supabase SQL Editor
-- Tworzy bucket na zdjecia profilowe i polityki dostepu

-- 1. Utworz bucket "avatars"
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Polityka: kazdy zalogowany moze uploadowac do swojego folderu
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Polityka: kazdy moze czytac avatary (publiczne)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 4. Polityka: wlasciciel moze aktualizowac swoj avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Polityka: wlasciciel moze usunac swoj avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 6. Dodaj kolumne avatar_url do profiles (jesli nie ma)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL;
