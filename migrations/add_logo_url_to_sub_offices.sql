-- ==============================================================================
-- MIGRATION: ADD `logo_url` COLUMN TO `public.sub_offices`
-- Description: Supports dynamic custom logo rendering per sub-office / franchise
-- ==============================================================================

-- 1. Add `logo_url` column if it does not already exist
ALTER TABLE public.sub_offices 
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '/lbp.png';

-- 2. Backfill existing records with default logo if null
UPDATE public.sub_offices 
SET logo_url = '/lbp.png' 
WHERE logo_url IS NULL;

-- 3. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sub_offices_logo_url ON public.sub_offices(logo_url);

