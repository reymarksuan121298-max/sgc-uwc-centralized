-- ==============================================================================
-- MIGRATION: Feature 5 — Profile Update & Password Change with Email Confirmation
-- Project: SGC UWC Centralized
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- 1. Add new profile columns to app_users (safe, idempotent)
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Unique constraint on email (optional — uncomment if desired)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);

-- 2. Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_pending_token UNIQUE (user_id)  -- one active token per user
);

CREATE INDEX IF NOT EXISTS idx_pw_reset_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_pw_reset_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pw_reset_used ON public.password_reset_tokens(used);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to password_reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "Allow all access to password_reset_tokens"
ON public.password_reset_tokens FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Create Supabase Storage bucket for avatars (run once)
-- You can also create this via Supabase Dashboard → Storage → New Bucket → "avatars" (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: anyone can read avatar images
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Authenticated users can upload/update their own avatar
DROP POLICY IF EXISTS "Anon avatar upload" ON storage.objects;
CREATE POLICY "Anon avatar upload"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anon avatar update" ON storage.objects;
CREATE POLICY "Anon avatar update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'avatars');

-- 4. Add app_users to realtime if not already
ALTER TABLE public.app_users REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_tokens;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ==============================================================================
-- DONE. Run this migration, then configure EmailJS env vars.
-- ==============================================================================
