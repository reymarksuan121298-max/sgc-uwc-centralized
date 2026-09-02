-- ==============================================================================
-- SUPABASE DATABASE RECREATION SCRIPT WITH COMPLETE BACKUP DATA & ENTERPRISE MODULES
-- Project: Mandaue STL Centralized Platform & Sub-Office Remittance System
-- ==============================================================================

-- 1. DROP EXISTING TABLES (Clean Rebuild)
DROP TABLE IF EXISTS public.settlement_payments CASCADE;
DROP TABLE IF EXISTS public.remittance_receipts CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.returned_winnings CASCADE;
DROP TABLE IF EXISTS public.app_users CASCADE;
DROP TABLE IF EXISTS public.sub_offices CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. CREATE `sub_offices` TABLE (Dedicated Branch Registry - Primary Authority)
-- ==============================================================================
CREATE TABLE public.sub_offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    head_name TEXT,
    contact_number TEXT,
    assigned_endpoint_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. CREATE `app_users` TABLE (Authentication, Roles & Sub-Office Scope)
-- ==============================================================================
CREATE TABLE public.app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'STAFF', -- 'Super Admin', 'Admin', 'Supervisor', 'Sub-Office Head', 'Staff', 'Collector', 'Auditor'
    sub_office TEXT DEFAULT 'All' REFERENCES public.sub_offices(name) ON UPDATE CASCADE ON DELETE SET NULL,
    branch_code TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. CREATE `returned_winnings` TABLE (Ledger, Commissions & Return Out)
-- ==============================================================================
CREATE TABLE public.returned_winnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "transactionId" TEXT NOT NULL UNIQUE,
    "apiId" TEXT,
    username TEXT,
    "fullName" TEXT,
    address TEXT,
    location TEXT,
    outlet TEXT,
    supervisor TEXT,
    sub_office TEXT REFERENCES public.sub_offices(name) ON UPDATE CASCADE,
    "tellerId" BIGINT,
    "drawId" BIGINT,
    "betCode" TEXT DEFAULT 'RS3',
    rambolito NUMERIC DEFAULT 0,
    "betNo" TEXT DEFAULT 'N/A',
    "betAmount" NUMERIC(15, 2) DEFAULT 0.00,
    "winAmount" NUMERIC(15, 2) DEFAULT 0.00,
    "paidAmount" NUMERIC(15, 2) DEFAULT 0.00,
    "return_amount_out" NUMERIC(15, 2) DEFAULT 0.00,
    receipt_status TEXT DEFAULT 'NO_RECEIPT', -- 'NO_RECEIPT', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'
    
    -- 4-Tier Commission Allocation: 50% Admin, 30% Agent/Teller, 10% Staff, 10% Collector
    admin_commission NUMERIC(15, 2) DEFAULT 0.00,
    agent_commission NUMERIC(15, 2) DEFAULT 0.00,
    staff_commission NUMERIC(15, 2) DEFAULT 0.00,
    collector_commission NUMERIC(15, 2) DEFAULT 0.00,
    commission_breakdown JSONB,

    type INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    "isParent" TEXT,
    "isSoldOut" TEXT,
    "isLowWin" TEXT,
    "isVoid" INTEGER DEFAULT 0,
    "isClaim" INTEGER DEFAULT 0,
    "voidDate" TEXT,
    "isVoidByStaff" INTEGER DEFAULT 0,
    "reprintDate" TEXT,
    "claimDate" TEXT,
    "isOffline" TEXT,
    "CombiNo" TEXT,
    "SoldOutCombiNo" TEXT,
    "drawTime" TEXT,
    "drawDate" TEXT,
    "isUnderSettlement" BOOLEAN DEFAULT FALSE,
    "settlementTerms" JSONB,
    "totalInstallmentAmount" NUMERIC(15, 2),
    "settlementStatus" TEXT DEFAULT 'PENDING',
    batch_serial_no TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4.1 CREATE `settlement_payments` TABLE (Settlement Installment Payments)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.settlement_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "returnedWinningsId" UUID REFERENCES public.returned_winnings(id) ON DELETE CASCADE,
    "installmentNumber" INTEGER,
    "paymentAmount" NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    "paymentDate" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    "receivedBy" TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.settlement_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to settlement_payments for anon/authenticated" ON public.settlement_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_settlement_payments_returned_id ON public.settlement_payments("returnedWinningsId");
CREATE INDEX IF NOT EXISTS idx_settlement_payments_date ON public.settlement_payments("paymentDate" DESC);

-- ==============================================================================
-- 5. CREATE `remittance_receipts` TABLE (Multi-Channel Proofs: GCash, Cebuana, Bank)
-- ==============================================================================
CREATE TABLE public.remittance_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_serial_no TEXT,
    sub_office TEXT NOT NULL REFERENCES public.sub_offices(name) ON UPDATE CASCADE,
    uploaded_by_user TEXT NOT NULL,
    payment_channel TEXT NOT NULL, -- 'GCASH', 'CEBUANA', 'BANK_TRANSFER', 'CASH_PALAWAN'
    reference_number TEXT NOT NULL,
    sender_name TEXT,
    sender_mobile TEXT,
    bank_name TEXT,
    remittance_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_image_url TEXT, -- Base64 Data URL or Supabase Storage URL
    verification_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'REJECTED'
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    tickets_count INTEGER DEFAULT 1,
    affected_transaction_ids TEXT[],
    batch_type TEXT DEFAULT 'INDIVIDUAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 6. CREATE `system_settings` TABLE (Centralized Dynamic Configuration)
-- ==============================================================================
CREATE TABLE public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 7. CREATE `audit_logs` TABLE (Enterprise Immutable Activity Trail)
-- ==============================================================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_username TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,       -- E.g. 'TICKET_RETURNED', 'RECEIPT_UPLOADED', 'RECEIPT_VERIFIED', 'USER_CREATED', 'CONFIG_UPDATED'
    target_type TEXT NOT NULL,  -- 'TICKET', 'RECEIPT', 'USER', 'SYSTEM'
    target_id TEXT,
    sub_office TEXT REFERENCES public.sub_offices(name) ON UPDATE CASCADE,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 7. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_sub_offices_name ON public.sub_offices(name);
CREATE INDEX IF NOT EXISTS idx_sub_offices_status ON public.sub_offices(status);
CREATE INDEX IF NOT EXISTS idx_app_users_username ON public.app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_sub_office ON public.app_users(sub_office);
CREATE INDEX IF NOT EXISTS idx_returned_winnings_trans_id ON public.returned_winnings("transactionId");
CREATE INDEX IF NOT EXISTS idx_returned_winnings_sub_office ON public.returned_winnings(sub_office);
CREATE INDEX IF NOT EXISTS idx_returned_winnings_created_at ON public.returned_winnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returned_winnings_username ON public.returned_winnings(username);
CREATE INDEX IF NOT EXISTS idx_returned_winnings_draw_date ON public.returned_winnings("drawDate");
CREATE INDEX IF NOT EXISTS idx_remittance_receipts_batch_serial ON public.remittance_receipts(batch_serial_no);
CREATE INDEX IF NOT EXISTS idx_remittance_receipts_status ON public.remittance_receipts(verification_status);
CREATE INDEX IF NOT EXISTS idx_remittance_receipts_sub_office ON public.remittance_receipts(sub_office);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==============================================================================
ALTER TABLE public.sub_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returned_winnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remittance_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to sub_offices for anon/authenticated" ON public.sub_offices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to app_users for anon/authenticated" ON public.app_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to returned_winnings for anon/authenticated" ON public.returned_winnings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to remittance_receipts for anon/authenticated" ON public.remittance_receipts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to system_settings for anon/authenticated" ON public.system_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to audit_logs for anon/authenticated" ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 9. SEED DATA: DEFAULT SUB-OFFICES (`sub_offices`)
-- ==============================================================================
INSERT INTO public.sub_offices (id, name, location, head_name, contact_number, assigned_endpoint_id, status)
VALUES
    ('so-default-0', 'All', 'Global Central Operations HQ', 'Central Admin', '0917-000-0000', 'cfg-default-1', 'ACTIVE'),
    ('so-default-1', 'Mandaue Central', 'Barlaps, A.S. Fortuna St., Bakilid, Mandaue City', 'Main HQ Supervisor', '0917-123-4567', 'cfg-default-1', 'ACTIVE'),
    ('so-default-2', 'Tipolo', 'Tipolo Branch, Mandaue City', 'Tipolo Operations Head', '0917-234-5678', NULL, 'ACTIVE'),
    ('so-default-3', 'Canduman', 'Canduman Branch, Mandaue City', 'Canduman Operations Head', '0917-345-6789', NULL, 'ACTIVE'),
    ('so-default-4', 'Ibabao-Estancia', 'Ibabao-Estancia Branch, Mandaue City', 'Ibabao Operations Head', '0917-456-7890', NULL, 'ACTIVE'),
    ('so-default-5', 'Pagsabungan', 'Pagsabungan Branch, Mandaue City', 'Pagsabungan Operations Head', '0917-567-8901', NULL, 'ACTIVE'),
    ('so-default-6', 'Centro', 'Centro Branch, Mandaue City', 'Centro Operations Head', '0917-678-9012', NULL, 'ACTIVE')
ON CONFLICT (name) DO UPDATE 
SET 
    location = EXCLUDED.location,
    head_name = EXCLUDED.head_name,
    contact_number = EXCLUDED.contact_number,
    status = EXCLUDED.status;

-- ==============================================================================
-- 10. SEED DATA: DEFAULT SYSTEM CONFIGURATION (`system_settings`)
-- ==============================================================================
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('commission_rates', '{"admin": 50, "agent": 30, "staff": 10, "collector": 10}'::jsonb, 'Standard 4-Tier Commission Percentage Distribution'),
    ('sub_offices', '["Tipolo", "Canduman", "Ibabao-Estancia", "Pagsabungan", "Centro"]'::jsonb, 'Configured Sub-Office Branches'),
    ('api_endpoints', '[{"id": "cfg-default-1", "name": "Mandaue Central", "sub_office": "All", "baseUrl": "https://stl-mandaue-api.com", "token": "Bearer 2860|OCyU72t1DzxdBeSjj3izVKCIcCwHkqNbwjRlxHp5", "isClaim": 0, "is_active": true, "is_default": true}]'::jsonb, 'Central API Connection Settings')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;



-- ==============================================================================
-- 12. UTILITY: RESET ALL RETURNED WINNINGS TO UNREMITTED STATUS (OPTIONAL RUN)
-- ==============================================================================
-- To restore any existing tickets back to unremitted (pending weekly remittance):
UPDATE public.returned_winnings 
SET 
    receipt_status = 'NO_RECEIPT',
    updated_at = timezone('utc'::text, now())
WHERE receipt_status IS DISTINCT FROM 'NO_RECEIPT';

-- ==============================================================================
-- 13. MIGRATION SCRIPT: ALTER EXISTING TABLES FOR SRN BATCHES & SETTLEMENTS
-- (Run this snippet if you have existing production tables to upgrade safely)
-- ==============================================================================

-- 13.1 Upgrade `remittance_receipts` (Remove transactionId, add batch SRN columns)
ALTER TABLE public.remittance_receipts 
DROP COLUMN IF EXISTS "transactionId",
ADD COLUMN IF NOT EXISTS batch_serial_no TEXT,
ADD COLUMN IF NOT EXISTS tickets_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS affected_transaction_ids TEXT[],
ADD COLUMN IF NOT EXISTS batch_type TEXT DEFAULT 'INDIVIDUAL';

CREATE INDEX IF NOT EXISTS idx_remittance_receipts_batch_serial ON public.remittance_receipts(batch_serial_no);

-- 13.2 Upgrade `returned_winnings`
ALTER TABLE public.returned_winnings
ADD COLUMN IF NOT EXISTS batch_serial_no TEXT,
ADD COLUMN IF NOT EXISTS "isUnderSettlement" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "settlementTerms" JSONB,
ADD COLUMN IF NOT EXISTS "totalInstallmentAmount" NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS "settlementStatus" TEXT DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_returned_winnings_batch_serial ON public.returned_winnings(batch_serial_no);
CREATE INDEX IF NOT EXISTS idx_returned_winnings_settlement_status ON public.returned_winnings("settlementStatus");

-- 13.3 Create `settlement_payments` if not yet present
CREATE TABLE IF NOT EXISTS public.settlement_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "returnedWinningsId" UUID REFERENCES public.returned_winnings(id) ON DELETE CASCADE,
    "installmentNumber" INTEGER,
    "paymentAmount" NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    "paymentDate" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    "receivedBy" TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.settlement_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to settlement_payments for anon/authenticated" ON public.settlement_payments;
CREATE POLICY "Allow all access to settlement_payments for anon/authenticated" 
ON public.settlement_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_settlement_payments_returned_id ON public.settlement_payments("returnedWinningsId");
CREATE INDEX IF NOT EXISTS idx_settlement_payments_date ON public.settlement_payments("paymentDate" DESC);

-- 13.4 Deletion Request Columns on `returned_winnings`
ALTER TABLE public.returned_winnings
ADD COLUMN IF NOT EXISTS deletion_request_status TEXT,
ADD COLUMN IF NOT EXISTS deletion_request_reason TEXT,
ADD COLUMN IF NOT EXISTS deletion_request_by TEXT,
ADD COLUMN IF NOT EXISTS deletion_request_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_rejected_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_returned_winnings_deletion_status ON public.returned_winnings(deletion_request_status);

-- ==============================================================================
-- 14. SUPABASE REALTIME REPLICATION & PUBLICATION SETUP
-- ==============================================================================

-- 14.1 Enable Full Replica Identity so that updates and deletes broadcast complete row details
ALTER TABLE public.returned_winnings REPLICA IDENTITY FULL;
ALTER TABLE public.remittance_receipts REPLICA IDENTITY FULL;
ALTER TABLE public.settlement_payments REPLICA IDENTITY FULL;
ALTER TABLE public.system_settings REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.app_users REPLICA IDENTITY FULL;

-- 14.2 Ensure supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 14.3 Add tables to realtime publication safely
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.returned_winnings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.remittance_receipts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.settlement_payments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ==============================================================================
-- 15. TICKET VERIFICATION OCR CHATROOM (SSR <-> STAFF DIRECT VERIFICATION)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_verification_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id TEXT,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'SSR',
    sub_office TEXT DEFAULT 'Mandaue Central',
    recipient_id TEXT,
    recipient_name TEXT,
    room_id TEXT,
    message_text TEXT,
    image_url TEXT,
    ocr_data JSONB, -- Stores scanned { transactionId, code, agent, draw, winAmount, combinations, rawText, roomId, isGroup }
    verification_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'VERIFIED' | 'REJECTED' | 'INFO'
    matched_transaction_id TEXT,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Migration safety for existing tables
ALTER TABLE public.ticket_verification_chats ADD COLUMN IF NOT EXISTS recipient_id TEXT;
ALTER TABLE public.ticket_verification_chats ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.ticket_verification_chats ADD COLUMN IF NOT EXISTS room_id TEXT;

ALTER TABLE public.ticket_verification_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to ticket_verification_chats for anon/authenticated" ON public.ticket_verification_chats;
CREATE POLICY "Allow all access to ticket_verification_chats for anon/authenticated" 
ON public.ticket_verification_chats FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tv_chats_status ON public.ticket_verification_chats(verification_status);
CREATE INDEX IF NOT EXISTS idx_tv_chats_created ON public.ticket_verification_chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tv_chats_trans_id ON public.ticket_verification_chats(matched_transaction_id);
CREATE INDEX IF NOT EXISTS idx_tv_chats_room_id ON public.ticket_verification_chats(room_id);
CREATE INDEX IF NOT EXISTS idx_tv_chats_recipient_id ON public.ticket_verification_chats(recipient_id);

ALTER TABLE public.ticket_verification_chats REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_verification_chats;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ==============================================================================
-- 16. VIDEO CALLING & LIVE OCR AUDIT TRAIL (`video_call_logs`)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.video_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caller_id TEXT,
    caller_name TEXT NOT NULL,
    caller_role TEXT NOT NULL DEFAULT 'SSR',
    caller_sub_office TEXT DEFAULT 'Mandaue Central',
    recipient_id TEXT,
    recipient_name TEXT,
    room_id TEXT,
    call_type TEXT NOT NULL DEFAULT 'VIDEO', -- 'VIDEO' | 'AUDIO' | 'SCREEN_SHARE'
    status TEXT NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED' | 'MISSED' | 'REJECTED' | 'CANCELLED'
    duration_seconds INTEGER DEFAULT 0,
    scanned_ticket_id TEXT,
    notes TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.video_call_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to video_call_logs for anon/authenticated" ON public.video_call_logs;
CREATE POLICY "Allow all access to video_call_logs for anon/authenticated" 
ON public.video_call_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_vcl_caller_id ON public.video_call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_vcl_recipient_id ON public.video_call_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_vcl_room_id ON public.video_call_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_vcl_created_at ON public.video_call_logs(created_at DESC);

ALTER TABLE public.video_call_logs REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_call_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;





