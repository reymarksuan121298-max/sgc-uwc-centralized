-- ==============================================================================
-- MIGRATION: ADD FRANCHISE NAME TO SUB_OFFICES TABLE
-- Adds franchise_name column, index, and default backfill for existing records.
-- ==============================================================================

-- 1. Add franchise_name column if it does not already exist
ALTER TABLE public.sub_offices 
ADD COLUMN IF NOT EXISTS franchise_name TEXT;

-- 2. Create index for performance on franchise_name lookups
CREATE INDEX IF NOT EXISTS idx_sub_offices_franchise_name 
ON public.sub_offices(franchise_name);

-- 3. Backfill existing sub-offices to default franchise 'MANDAUE' if NULL or empty
UPDATE public.sub_offices
SET franchise_name
WHERE franchise_name IS NULL OR TRIM(franchise_name) = '';

-- Notify schema reload / comment
COMMENT ON COLUMN public.sub_offices.franchise_name IS 'Parent franchise organization (e.g. MANDAUE, ILIGAN, SGC)';
