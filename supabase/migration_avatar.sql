-- Dodaj kolumne avatar_color do tabeli profiles
-- Wklej to w Supabase → SQL Editor → Run

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_color text DEFAULT 'purple';
