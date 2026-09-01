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






-- ==============================================================================
-- LIVE DATA BACKUP (returned_winnings & settlement_payments)
-- ==============================================================================

INSERT INTO public.returned_winnings ("id", "transactionId", "fullName", "betNo", "betCode", "betAmount", "winAmount", "drawTime", "created_at", "apiId", "username", "address", "location", "outlet", "supervisor", "tellerId", "drawId", "rambolito", "type", "status", "isParent", "isSoldOut", "isLowWin", "isVoid", "isClaim", "voidDate", "isVoidByStaff", "reprintDate", "claimDate", "isOffline", "CombiNo", "SoldOutCombiNo", "drawDate", "updated_at", "isUnderSettlement", "settlementTerms", "totalInstallmentAmount", "settlementStatus") VALUES
    ('cc3a446f-941c-4b9a-9d5f-06404a11db96', '081626-OIIRA0CN', 'BARDAGU, DAPHNIE', '784', 'TS3', 10, 5000, '17', '2026-08-22T15:34:14.757229+00:00', 45210, 'spvr-carl', 'IBABAO-ESTANCIA, MANDAUE CITY', 'MANDAUE CITY', 'BARDAGU, DAPHNIE', NULL, 263, 17, 0, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', NULL, NULL, '2026-08-16T00:00:00+00:00', '2026-08-22T15:34:14.757229+00:00', true, '{"reason":"Wala na scan ang cesibo, paso na at hindi na makita.","installments":[{"id":1,"dueDate":"2026-08-26","amountDue":"500.00","status":"PAID, QUENNIE LIM"},{"id":2,"dueDate":"","amountDue":"500.00","status":"Pending"},{"id":3,"dueDate":"","amountDue":"500.00","status":"Pending"},{"id":4,"dueDate":"","amountDue":"500.00","status":"Pending"},{"id":5,"dueDate":"","amountDue":"500.00","status":"Pending"},{"id":6,"dueDate":"","amountDue":"500.00","status":"Pending"},{"id":7,"dueDate":"","amountDue":"500.00","status":"Pending"},{"id":8,"dueDate":"","amountDue":"500.00","status":"Pending"},{"id":9,"dueDate":"","amountDue":"500.00","status":"Pending"},{"id":10,"dueDate":"","amountDue":"500.00","status":"Pending"}]}', 5000, 'PARTIAL'),
    ('751add20-2587-4715-bb79-08d169793a65', '081726-OUA4KY2Z', 'LESLIE S. DESABILLE', '058', 'RS3', 10, 833, '21', '2026-08-29T04:31:12.379103+00:00', 200564, 'spvr-molly', 'KABILDUHAN, LOOC', 'MANTUYONG', 'LESLIE S. DESABILLE', NULL, 335, 25, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, '2026-08-17T18:16:00+00:00', NULL, '0', ''',058,,508,,085,,805,,580,,850,''', NULL, '2026-08-17T00:00:00+00:00', '2026-08-29T04:31:12.379103+00:00', false, NULL, NULL, 'PENDING'),
    ('148fe49b-f898-4612-b557-1d0bde143b57', '082526-IOUDQIGF', 'MA. ARJEN COMAHIG', '941', 'RS3', 10, 833, '21', '2026-08-29T04:32:15.450641+00:00', 1064642, 'spvr-michael', 'SAN JOSE 1, LABOGON MANDAUE CITY', 'SAN JOSE 1, LABOGON MANDAUE CITY', 'MA. ARJEN COMAHIG', NULL, 306, 73, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', ''',941,,491,,914,,194,,419,,149,''', NULL, '2026-08-25T00:00:00+00:00', '2026-08-29T04:32:15.450641+00:00', false, NULL, NULL, 'PENDING'),
    ('dfae4f08-9e9a-4d46-9d25-f1ab4ca5c7d7', '082426-UOEP8GRV', 'MARY GRACE SUPERAL', '543', 'RS3', 10, 833, '21', '2026-08-30T03:52:37.449239+00:00', 914400, 'spvr-arlfred', 'CAMBARO, MANDAUE CITY', 'MANDAUE CITY', 'MARY GRACE, SUPERAL', NULL, 119, 67, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', ''',543,,453,,534,,354,,435,,345,''', NULL, '2026-08-24T00:00:00+00:00', '2026-08-30T03:52:37.449239+00:00', false, NULL, NULL, 'PENDING'),
    ('2d1e0f57-7f15-4609-b0c9-7e082a3a75f9', '082126-UAI30S5S', 'UMBAY, RICKA CHRISTELLE', '423', 'TS3', 10, 5000, '17', '2026-08-29T06:03:40.260484+00:00', 629790, 'spvr-eya', 'CANDUMAN, MANDAUE CITY', 'MANDAUE CITY', 'UMBAY, RICKA CHRISTELLE', NULL, 104, 47, 0, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', NULL, NULL, '2026-08-21T00:00:00+00:00', '2026-08-29T06:03:40.260484+00:00', true, '{"reason":"The agent did not follow the standard ticket verification policy; the claim was submitted to the office without the original physical receipt, preventing system scanning.","frequency":"weekly","installmentsCount":25,"installments":[{"id":1,"dueDate":"2026-09-05","amountDue":"200.00","status":"Pending"},{"id":2,"dueDate":"2026-09-12","amountDue":"200.00","status":"Pending"},{"id":3,"dueDate":"2026-09-19","amountDue":"200.00","status":"Pending"},{"id":4,"dueDate":"2026-09-26","amountDue":"200.00","status":"Pending"},{"id":5,"dueDate":"2026-10-03","amountDue":"200.00","status":"Pending"},{"id":6,"dueDate":"2026-10-10","amountDue":"200.00","status":"Pending"},{"id":7,"dueDate":"2026-10-17","amountDue":"200.00","status":"Pending"},{"id":8,"dueDate":"2026-10-24","amountDue":"200.00","status":"Pending"},{"id":9,"dueDate":"2026-10-31","amountDue":"200.00","status":"Pending"},{"id":10,"dueDate":"2026-11-07","amountDue":"200.00","status":"Pending"},{"id":11,"dueDate":"2026-11-14","amountDue":"200.00","status":"Pending"},{"id":12,"dueDate":"2026-11-21","amountDue":"200.00","status":"Pending"},{"id":13,"dueDate":"2026-11-28","amountDue":"200.00","status":"Pending"},{"id":14,"dueDate":"2026-12-05","amountDue":"200.00","status":"Pending"},{"id":15,"dueDate":"2026-12-12","amountDue":"200.00","status":"Pending"},{"id":16,"dueDate":"2026-12-19","amountDue":"200.00","status":"Pending"},{"id":17,"dueDate":"2026-12-26","amountDue":"200.00","status":"Pending"},{"id":18,"dueDate":"2027-01-02","amountDue":"200.00","status":"Pending"},{"id":19,"dueDate":"2027-01-09","amountDue":"200.00","status":"Pending"},{"id":20,"dueDate":"2027-01-16","amountDue":"200.00","status":"Pending"},{"id":21,"dueDate":"2027-01-23","amountDue":"200.00","status":"Pending"},{"id":22,"dueDate":"2027-01-30","amountDue":"200.00","status":"Pending"},{"id":23,"dueDate":"2027-02-06","amountDue":"200.00","status":"Pending"},{"id":24,"dueDate":"2027-02-13","amountDue":"200.00","status":"Pending"},{"id":25,"dueDate":"2027-02-20","amountDue":"200.00","status":"Pending"}]}', 5000, 'PARTIAL'),
    ('bdb1fae6-9aed-4192-8cdd-eb9ae01aa1c5', '082926-UOUEZOHE', 'DORIAS, JANNET', '369', 'RS3', 10, 833, '14', '2026-08-31T05:11:51.934117+00:00', 1425653, 'spvr-joel', 'MANDAUE CITY', 'MANDAUE CITY', 'DORIAS, JANNET', NULL, 144, 93, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', ''',369,,639,,396,,936,,693,,963,''', NULL, '2026-08-29T00:00:00+00:00', '2026-08-31T05:11:51.934117+00:00', false, NULL, NULL, 'PENDING'),
    ('7b207eac-a455-44ed-8383-57b989817d64', '082826-OOELQM78', 'MARIA CORAZON TORENO', '830', 'RS3', 12, 1000, '17', '2026-08-31T05:12:20.216776+00:00', 1355623, 'spvr-joel', 'MANDAUE', 'MANDAUE', 'MARIA CORAZON TORENO', NULL, 323, 89, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', ''',830,,380,,803,,083,,308,,038,''', NULL, '2026-08-28T00:00:00+00:00', '2026-08-31T05:12:20.216776+00:00', false, NULL, NULL, 'PENDING'),
    ('c5745097-6caa-4968-b13b-de56840ac7bd', '082726-UIATJXWW', 'OMANDAC, ARSELA', '185', 'TS3', 25, 12500, '21', '2026-08-31T05:31:55.538992+00:00', 1294208, 'spvr-michael', 'PAKNAAN, MANDAUE CITY', 'MANDAUE CITY', 'OMANDAC, ARSELA', NULL, 243, 85, 0, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', NULL, NULL, '2026-08-27T00:00:00+00:00', '2026-08-31T05:31:55.538992+00:00', false, NULL, NULL, 'PENDING'),
    ('3cb2e15e-cf8a-4c5a-a0d0-84cf25bd8972', '082726-AIEDYHUM', 'AMANTE, JANELY', '518', 'RS3', 10, 833, '21', '2026-08-31T05:31:59.205603+00:00', 1288026, 'spvr-michael', 'LABOGON, MANDAUE CITY', 'MANDAUE CITY', 'AMANTE, JANELY', NULL, 227, 85, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', ''',518,,158,,581,,851,,185,,815,''', NULL, '2026-08-27T00:00:00+00:00', '2026-08-31T05:31:59.205603+00:00', false, NULL, NULL, 'PENDING'),
    ('1fa054ee-c400-4c8b-ac7c-dd71823498cb', '081626-OIAC4DXG', 'HERRERO, JOCELYN', '569', 'RS3', 10, 833, '14', '2026-08-21T15:51:38.96409+00:00', 38812, 'spvr-jed', 'PAGSABUNGAN, MANDAUE CITY', 'MANDAUE CITY', 'HERRERO, JOCELYN', 28, 201, 15, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', ''',569,,659,,596,,956,,695,,965,''', NULL, '2026-08-16T00:00:00+00:00', '2026-08-21T15:51:38.96409+00:00', false, NULL, NULL, 'PENDING'),
    ('d5cdc6fc-48ae-4225-9b96-f41a15113027', '082126-AIEUK6TP', 'JUDY ANN FUENTES', '324', 'RS3', 50, 4167, '17', '2026-08-23T04:29:47.501267+00:00', 633479, 'spvr-jason', 'TIPOLO, MANDAUE CITY', 'MANDAUE CITY', 'JUDY ANN FUENTES', NULL, 88, 47, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', ''',324,,234,,342,,432,,243,,423,''', NULL, '2026-08-21T00:00:00+00:00', '2026-08-23T04:29:47.501267+00:00', false, NULL, NULL, 'PENDING'),
    ('fc9fd2d4-8511-44f8-a1f0-43ab1062b969', '082026-UAU0OGUY', 'GARAN, ANALIZA', '792', 'RS3', 10, 833, '21', '2026-08-23T03:57:22.402103+00:00', 545311, 'spvr-roel', 'CANDUMAN, MANDAUE CITY', 'MANDAUE CITY', 'GARAN, ANALIZA', NULL, 46, 43, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', ''',792,,972,,729,,279,,927,,297,''', NULL, '2026-08-20T00:00:00+00:00', '2026-08-23T03:57:22.402103+00:00', false, NULL, NULL, 'PENDING'),
    ('ca2aad6c-2934-4d2e-b7e3-78d9beb35351', '082026-UOIMITEJ', 'FLORES, NINAMARIE', '972', 'RS3', 5, 417, '21', '2026-08-23T05:10:24.30911+00:00', 541999, 'spvr-joel', 'MANDAUE CITY', 'MANDAUE CITY', 'FLORES, NINAMARIE', NULL, 188, 43, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', ''',972,,792,,927,,297,,729,,279,''', NULL, '2026-08-20T00:00:00+00:00', '2026-08-23T05:10:24.30911+00:00', false, NULL, NULL, 'PENDING'),
    ('fadd887e-fde4-46a5-a24a-f0095d60ce8a', '081726-EOELNEFJ', 'BACASON, BELLA', '850', 'RS3', 10, 833, '21', '2026-08-24T05:01:42.674068+00:00', 219081, 'spvr-eya', 'CANDUMAN, MANDAUE CITY', 'MANDAUE CITY', 'BACASON, BELLA', NULL, 53, 25, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', ''',850,,580,,805,,085,,508,,058,''', NULL, '2026-08-17T00:00:00+00:00', '2026-08-24T05:01:42.674068+00:00', false, NULL, NULL, 'PENDING'),
    ('ce580207-f67e-4956-a538-076f932959e5', '082326-UEOB1FTA', 'SOON, CHERYL', '672', 'RS3', 5, 417, '14', '2026-08-25T04:27:06.603252+00:00', 787663, 'spvr-michael', 'PAKNAAN, MANDAUE CITY', 'MANDAUE CITY', 'SOON, CHERYL', NULL, 245, 57, 1, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', ''',672,,762,,627,,267,,726,,276,''', NULL, '2026-08-23T00:00:00+00:00', '2026-08-25T04:27:06.603252+00:00', false, NULL, NULL, 'PENDING'),
    ('39a92145-1963-4d69-a314-1e46f39e6b10', '082426-AIEGUYQC', 'ZENAIDA BOYONAS', '435', 'TS3', 5, 2500, '21', '2026-08-27T04:13:52.46916+00:00', 957564, 'spvr-roel', 'LABOGON, MANDAUE CITY', 'MANDUE CITY', 'ZENAIDA BOYONAS', NULL, 226, 67, 0, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', NULL, NULL, '2026-08-24T00:00:00+00:00', '2026-08-27T04:13:52.46916+00:00', false, NULL, NULL, 'PENDING'),
    ('c58a5842-f04c-4c1e-98a6-813a6f4d71b7', '082526-OUAIIOFW', 'ROSEMARIE SANORIA', '726', 'TS3', 3, 1500, '17', '2026-08-28T05:31:51.456697+00:00', 1039929, 'spvr-arlfred', 'LOOC MANDAUE CITY', 'MANDAUE CITY', 'ROSEMARIE SANORIA', NULL, 196, 71, 0, 0, 1, '1', '0', '0', 0, 0, NULL, 0, NULL, NULL, '0', NULL, NULL, '2026-08-25T00:00:00+00:00', '2026-08-28T05:31:51.456697+00:00', false, NULL, NULL, 'PENDING')
ON CONFLICT ("transactionId") DO NOTHING;
