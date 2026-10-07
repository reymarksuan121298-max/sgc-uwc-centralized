-- ==============================================================================
-- MIGRATION: Dedicated Table for Unclaimed Ticket Remarks
-- Project: SGC UWC Centralized
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- 1. Create `unclaimed_ticket_remarks` table
CREATE TABLE IF NOT EXISTS public.unclaimed_ticket_remarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id TEXT NOT NULL UNIQUE,
    remark TEXT NOT NULL,
    author_username TEXT NOT NULL,
    author_name TEXT,
    author_role TEXT,
    sub_office TEXT,
    ticket_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_unclaimed_remarks_trans_id ON public.unclaimed_ticket_remarks(transaction_id);
CREATE INDEX IF NOT EXISTS idx_unclaimed_remarks_sub_office ON public.unclaimed_ticket_remarks(sub_office);
CREATE INDEX IF NOT EXISTS idx_unclaimed_remarks_created_at ON public.unclaimed_ticket_remarks(created_at DESC);

-- 3. Row Level Security & Access Policies
ALTER TABLE public.unclaimed_ticket_remarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to unclaimed_ticket_remarks for anon/authenticated" ON public.unclaimed_ticket_remarks;
CREATE POLICY "Allow all access to unclaimed_ticket_remarks for anon/authenticated"
ON public.unclaimed_ticket_remarks FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

-- 4. Enable Realtime Replication for `unclaimed_ticket_remarks`
ALTER PUBLICATION supabase_realtime ADD TABLE public.unclaimed_ticket_remarks;
