CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DROP TABLE IF EXISTS public.sub_offices CASCADE;

CREATE TABLE public.sub_offices (
    id TEXT PRIMARY KEY DEFAULT ('so-' || substr(uuid_generate_v4()::text, 1, 8)),
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    head_name TEXT,
    contact_number TEXT,
    assigned_endpoint_id TEXT,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sub_offices_name ON public.sub_offices(name);
CREATE INDEX IF NOT EXISTS idx_sub_offices_status ON public.sub_offices(status);

ALTER TABLE public.sub_offices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to sub_offices for anon/authenticated" ON public.sub_offices;
CREATE POLICY "Allow all access to sub_offices for anon/authenticated"
ON public.sub_offices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.sub_offices REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sub_offices; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

INSERT INTO public.sub_offices (id, name, location, head_name, contact_number, assigned_endpoint_id, status, created_at, updated_at, logo_url)
VALUES
  ('e79353e8-23a2-46d0-b830-89fda3b5d8f1', 'Mandaue City', 'Barlaps, A.S. Fortuna St., Bakilid, Mandaue City', 'QUENNIE CAPUYAN', '0917-123-4567', NULL, 'ACTIVE', '2026-08-31T05:41:45.3222+00:00', '2026-09-12T04:08:43.609+00:00', NULL),
  ('bd1e8245-1e4f-4d79-bccd-10e3ab6c1f4c', 'ILIGAN SET B', 'ILIGAN CITY', 'ANGELA TOMAQUIN', '', NULL, 'ACTIVE', '2026-09-08T02:54:05.650599+00:00', '2026-09-12T04:08:59.994+00:00', NULL),
  ('e5d09a66-0498-4d2d-8a0c-7de0b499d5d8', 'ILIGAN SET A', 'ILIGAN CITY', 'KIN JOHN L. AGUINALDO', '', NULL, 'ACTIVE', '2026-09-08T02:53:17.933197+00:00', '2026-09-08T04:23:07.087+00:00', NULL),
  ('29428b9c-548d-42aa-b5db-afb90d877ac3', 'BALOI OFFICE', 'BALOI', 'KIN JOHN L. AGUINALDO', '', NULL, 'ACTIVE', '2026-09-08T02:54:57.617081+00:00', '2026-09-08T04:24:14.415+00:00', NULL),
  ('491ef36b-a15b-40d5-bad7-1fea3ad185ce', 'LALA OFFICE', 'Maranding, Lanao del Norte', 'RICHELOU', '', NULL, 'ACTIVE', '2026-09-08T02:56:52.226511+00:00', '2026-09-08T04:26:42.175+00:00', NULL)
ON CONFLICT (name) DO NOTHING;

DROP TABLE IF EXISTS public.app_users CASCADE;

CREATE TABLE public.app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'Staff',
    sub_office TEXT DEFAULT 'All' REFERENCES public.sub_offices(name) ON UPDATE CASCADE ON DELETE SET NULL,
    branch_code TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    account_status TEXT DEFAULT 'APPROVED',
    transcode_visibility BOOLEAN DEFAULT FALSE,
    email TEXT,
    phone TEXT,
    bio TEXT,
    avatar_url TEXT,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_app_users_username ON public.app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_sub_office ON public.app_users(sub_office);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to app_users for anon/authenticated" ON public.app_users;
CREATE POLICY "Allow all access to app_users for anon/authenticated"
ON public.app_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.app_users REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

INSERT INTO public.app_users (id, username, password, full_name, role, sub_office, branch_code, is_active, last_login_at, created_at, updated_at, email, phone, bio, avatar_url)
VALUES
  ('be417f77-29e5-41b5-8af2-89624a44d169', 'ssrwild@stl.com', '64e08bbd312f82bdb359ecc9e02fbdb40f19acca9cbb716aa08f260e8eb35c7a', 'Wildy Jane', 'Sales Service Representative', 'ILIGAN SET B', NULL, TRUE, '2026-09-12T12:03:37.572+00:00', '2026-09-08T03:49:18.072084+00:00', '2026-09-09T07:45:25.671+00:00', NULL, NULL, NULL, NULL),
  ('27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'admin', '0fbb193d132533892ee146222146dd53ec3fa761c8b018769e1417aea3e34861', 'Reymark Suan', 'Admin', NULL, NULL, TRUE, '2026-09-14T07:38:53.827+00:00', '2026-08-31T05:41:45.3222+00:00', '2026-09-08T08:49:39.161+00:00', 'xxlordshin@gmail.com', '09382756065', 'Admin Ngani', 'https://kiuykhakbpjesoofinil.supabase.co/storage/v1/object/public/avatars/avatars/27dfca93-b28c-4422-85b9-8c6a0b5d8671.jpg?t=1788619576311'),
  ('d8f26528-a956-412d-8d3a-73e0076a38ce', 'yuki@stl.com', '68bdf0cb47fa3dce05d25de5ef61216d381e994d7813b19c931f7a17d16442ab', 'Aizah Condrado', 'Unclaimed Specialist', 'Mandaue City', NULL, TRUE, '2026-09-07T02:06:07.593+00:00', '2026-08-31T07:37:21.349932+00:00', '2026-09-07T02:12:33.528+00:00', 'aisahcondrado@gmail.com', NULL, NULL, 'https://kiuykhakbpjesoofinil.supabase.co/storage/v1/object/public/avatars/avatars/d8f26528-a956-412d-8d3a-73e0076a38ce.jpg?t=1788700948482'),
  ('7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'ssr-ryan@stl.com', 'd8eb88694dc7f4275f072550501758ae0153432765782e4f50ce3e2e9efa2f95', 'Jay Ryan Lim', 'Sales Service Representative', 'Mandaue City', NULL, TRUE, '2026-09-13T00:56:41.766+00:00', '2026-08-31T06:21:19.432724+00:00', '2026-09-09T05:19:11.301+00:00', 'itreports.company@gmail.com', '09360291943', 'MABAIT LANG PO', 'https://kiuykhakbpjesoofinil.supabase.co/storage/v1/object/public/avatars/avatars/7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1.jpg?t=1788670027438'),
  ('2587328b-0938-4b26-8afe-4a239f7bd7fb', 'qwyn', '583d2b72c48e35dc3d03d33870a9c38b3bfd8c47126429d887cf50599b4695b1', 'Quennie Lim', 'Sales Service Representative', 'Mandaue City', NULL, TRUE, '2026-09-13T07:11:53.459+00:00', '2026-09-05T05:35:32.561253+00:00', '2026-09-09T05:19:19.645+00:00', NULL, NULL, NULL, 'https://kiuykhakbpjesoofinil.supabase.co/storage/v1/object/public/avatars/avatars/2587328b-0938-4b26-8afe-4a239f7bd7fb.jpg?t=1788684206016')
ON CONFLICT (username) DO NOTHING;

DROP TABLE IF EXISTS public.system_settings CASCADE;

CREATE TABLE public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to system_settings for anon/authenticated" ON public.system_settings;
CREATE POLICY "Allow all access to system_settings for anon/authenticated"
ON public.system_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.system_settings REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

INSERT INTO public.system_settings (key, value, description, updated_by, updated_at)
VALUES
  ('gateway_endpoints', '[{"id":"cfg-1788156811901","name":"stl-mandaue","token":"Bearer 4815|WiRvneX7taOznymk2LfjGEnEe7uflvfllOVJnrQx","baseUrl":"https://stl-mandaue-api.com","isClaim":0,"is_active":true,"created_at":"2026-08-31T06:13:31.901Z","is_default":true,"sub_office":"Mandaue City"},{"id":"cfg-1788836372890","name":"stl-ldn","token":"Bearer 67648|n2PTcNJLrgmENdlpFQPoXHgII2s0DmeG6MqSPWcw","baseUrl":"https://stl-ldn-api.com","isClaim":0,"is_active":true,"created_at":"2026-09-08T02:59:32.890Z","is_default":false,"sub_office":"ILIGAN SET B, ILIGAN SET A, BALOI OFFICE, LALA OFFICE"}]'::jsonb, 'Gateway Connections', 'admin', '2026-09-12T05:35:45.489+00:00'),
  ('commission_config', '{"adminPercent":50,"agentPercent":30,"staffPercent":10,"collectorPercent":10}'::jsonb, NULL, 'admin', '2026-09-02T03:16:57.563+00:00'),
  ('api_endpoints', '[{"id":"cfg-1788156811901","name":"stl-mandaue","token":"Bearer 4815|WiRvneX7taOznymk2LfjGEnEe7uflvfllOVJnrQx","baseUrl":"https://stl-mandaue-api.com","isClaim":0,"is_active":true,"created_at":"2026-08-31T06:13:31.901Z","is_default":true,"sub_office":"Mandaue City"},{"id":"cfg-1788836372890","name":"stl-ldn","token":"Bearer 67648|n2PTcNJLrgmENdlpFQPoXHgII2s0DmeG6MqSPWcw","baseUrl":"https://stl-ldn-api.com","isClaim":0,"is_active":true,"created_at":"2026-09-08T02:59:32.890Z","is_default":false,"sub_office":"ILIGAN SET B, ILIGAN SET A, BALOI OFFICE, LALA OFFICE"}]'::jsonb, 'Gateway Connections', 'admin', '2026-09-12T05:35:45.489+00:00'),
  ('user_feature_permissions', '{"users":{"qwyn":{"enableQrModal":true,"enableHideTransId":false,"enableCopyTransaction":true},"admin":{"enableQrModal":false,"enableHideTransId":false,"enableCopyTransaction":false},"ssrwild@stl.com":{"enableQrModal":false,"enableHideTransId":false,"enableCopyTransaction":false},"ssr-ryan@stl.com":{"enableQrModal":true,"enableHideTransId":false,"enableCopyTransaction":true}},"default_qr_modal":true,"default_copy_transaction":true}'::jsonb, 'Per-User Permissions for Copy Transaction & QR Modal', 'admin', '2026-09-14T06:45:33.151+00:00')
ON CONFLICT (key) DO NOTHING;

DROP TABLE IF EXISTS public.returned_winnings CASCADE;

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
    sub_office TEXT,
    "tellerId" BIGINT,
    "drawId" BIGINT,
    "betCode" TEXT DEFAULT 'RS3',
    rambolito NUMERIC DEFAULT 0,
    "betNo" TEXT DEFAULT 'N/A',
    "betAmount" NUMERIC(15, 2) DEFAULT 0.00,
    "winAmount" NUMERIC(15, 2) DEFAULT 0.00,
    "paidAmount" NUMERIC(15, 2) DEFAULT 0.00,
    "return_amount_out" NUMERIC(15, 2) DEFAULT 0.00,
    receipt_status TEXT DEFAULT 'NO_RECEIPT',
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
    deletion_request_status TEXT,
    deletion_request_reason TEXT,
    deletion_request_by TEXT,
    deletion_request_at TIMESTAMPTZ,
    deletion_rejected_reason TEXT,
    deletion_request_attachment TEXT,
    hard_copy_ticket_url TEXT,
    teller_status TEXT,
    hr_valid_email TEXT,
    unclaimed_approval_status TEXT,
    unclaimed_approved_by TEXT,
    unclaimed_approval_issue TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_returned_winnings_trans_id ON public.returned_winnings("transactionId");
CREATE INDEX IF NOT EXISTS idx_returned_winnings_sub_office ON public.returned_winnings(sub_office);
CREATE INDEX IF NOT EXISTS idx_returned_winnings_created_at ON public.returned_winnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returned_winnings_username ON public.returned_winnings(username);
CREATE INDEX IF NOT EXISTS idx_returned_winnings_draw_date ON public.returned_winnings("drawDate");
CREATE INDEX IF NOT EXISTS idx_returned_winnings_batch_serial ON public.returned_winnings(batch_serial_no);
CREATE INDEX IF NOT EXISTS idx_returned_winnings_settlement_status ON public.returned_winnings("settlementStatus");
CREATE INDEX IF NOT EXISTS idx_returned_winnings_deletion_status ON public.returned_winnings(deletion_request_status);
CREATE INDEX IF NOT EXISTS idx_returned_winnings_teller_status ON public.returned_winnings(teller_status);
CREATE INDEX IF NOT EXISTS idx_returned_winnings_unclaimed_approval ON public.returned_winnings(unclaimed_approval_status);

ALTER TABLE public.returned_winnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to returned_winnings for anon/authenticated" ON public.returned_winnings;
CREATE POLICY "Allow all access to returned_winnings for anon/authenticated"
ON public.returned_winnings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.returned_winnings REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.returned_winnings; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

INSERT INTO public.returned_winnings (id, "transactionId", "apiId", username, "fullName", address, location, outlet, supervisor, sub_office, "tellerId", "drawId", "betCode", rambolito, "betNo", "betAmount", "winAmount", "paidAmount", return_amount_out, receipt_status, admin_commission, agent_commission, staff_commission, collector_commission, commission_breakdown, type, status, "isParent", "isSoldOut", "isLowWin", "isVoid", "voidDate", "isVoidByStaff", "reprintDate", "claimDate", "isOffline", "CombiNo", "SoldOutCombiNo", "drawTime", "drawDate", "isUnderSettlement", "settlementTerms", "totalInstallmentAmount", "settlementStatus", batch_serial_no, created_at, updated_at, deletion_request_status, deletion_request_reason, deletion_request_by, deletion_request_at, deletion_rejected_reason, deletion_request_attachment, hard_copy_ticket_url, teller_status, hr_valid_email, unclaimed_approval_status, unclaimed_approved_by, unclaimed_approval_issue)
VALUES
  ('b7f5a9e6-e08f-479e-a978-9fda62bf0b17', '082626-UOUBJ0IB', '1151386', 'spvr-eya', 'FERROLINO, JULIETA', 'CANDUMAN, MANDAUE CITY', 'MADAUE CITY', 'FERROLINO, JULIETA', '26', 'Mandaue City', NULL, NULL, 'RS3', 0, '658', 6, 500, 0, 500, 'VERIFIED', 250, 150, 50, 50, NULL, 0, 1, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, '17', '2026-08-26 00:00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260909-747456', '2026-09-01T04:00:00+00:00', '2026-09-09T07:06:15.184+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('598eb26c-5fb9-40f1-9a51-03f4c7c75934', '083026-IIULRMIA', '1589643', 'spvr-joel', 'MARY ANN, CATIPAY', 'MANDAUE CITY', 'MANDAUE CITY', 'MARY ANN, CATIPAY', '25', 'Mandaue City', NULL, NULL, 'RS3', 0, '647', 10, 833, 0, 833, 'VERIFIED', 416.5, 249.9, 83.3, 83.3, NULL, 0, 1, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, '17', '2026-08-30 00:00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260911-689599', '2026-09-04T06:10:58.494151+00:00', '2026-09-11T04:00:00+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('39a92145-1963-4d69-a314-1e46f39e6b10', '082426-AIEGUYQC', '957564', 'spvr-roel', 'ZENAIDA BOYONAS', 'LABOGON, MANDAUE CITY', 'MANDUE CITY', 'ZENAIDA BOYONAS', NULL, 'Mandaue City', 226, 67, 'TS3', 0, '435', 5, 2500, 0, 0, 'VERIFIED', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', NULL, NULL, '21', '2026-08-24T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260909-747456', '2026-08-27T04:13:52.46916+00:00', '2026-09-09T07:06:15.184+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('3cb2e15e-cf8a-4c5a-a0d0-84cf25bd8972', '082726-AIEDYHUM', '1288026', 'spvr-michael', 'AMANTE, JANELY', 'LABOGON, MANDAUE CITY', 'MANDAUE CITY', 'AMANTE, JANELY', NULL, 'Mandaue City', 227, 85, 'RS3', 1, '518', 10, 833, 0, 0, 'VERIFIED', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', ''',518,,158,,581,,851,,185,,815,''', NULL, '21', '2026-08-27T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260909-747456', '2026-08-31T05:31:59.205603+00:00', '2026-09-09T07:06:15.184+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('751add20-2587-4715-bb79-08d169793a65', '081726-OUA4KY2Z', '200564', 'spvr-molly', 'LESLIE S. DESABILLE', 'KABILDUHAN, LOOC', 'MANTUYONG', 'LESLIE S. DESABILLE', NULL, 'Mandaue City', 335, 25, 'RS3', 1, '058', 10, 833, 0, 0, 'VERIFIED', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, '2026-08-17T18:16:00+00:00', 0, NULL, NULL, '0', ''',058,,508,,085,,805,,580,,850,''', NULL, '21', '2026-08-17T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260909-747456', '2026-08-29T04:31:12.379103+00:00', '2026-09-09T07:06:15.184+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('7b207eac-a455-44ed-8383-57b989817d64', '082826-OOELQM78', '1355623', 'spvr-joel', 'MARIA CORAZON TORENO', 'MANDAUE', 'MANDAUE', 'MARIA CORAZON TORENO', NULL, 'Mandaue City', 323, 89, 'RS3', 1, '830', 12, 1000, 0, 0, 'VERIFIED', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', ''',830,,380,,803,,083,,308,,038,''', NULL, '17', '2026-08-28T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260909-747456', '2026-08-31T05:12:20.216776+00:00', '2026-09-09T07:06:15.184+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('bdb1fae6-9aed-4192-8cdd-eb9ae01aa1c5', '082926-UOUEZOHE', '1425653', 'spvr-joel', 'DORIAS, JANNET', 'MANDAUE CITY', 'MANDAUE CITY', 'DORIAS, JANNET', NULL, 'Mandaue City', 144, 93, 'RS3', 1, '369', 10, 833, 0, 0, 'VERIFIED', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', ''',369,,639,,396,,936,,693,,963,''', NULL, '14', '2026-08-29T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260909-747456', '2026-08-31T05:11:51.934117+00:00', '2026-09-09T07:06:15.184+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('c5745097-6caa-4968-b13b-de56840ac7bd', '082726-UIATJXWW', '1294208', 'spvr-michael', 'OMANDAC, ARSELA', 'PAKNAAN, MANDAUE CITY', 'MANDAUE CITY', 'OMANDAC, ARSELA', NULL, 'Mandaue City', 243, 85, 'TS3', 0, '185', 25, 12500, 0, 0, 'VERIFIED', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', NULL, NULL, '21', '2026-08-27T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260909-747456', '2026-08-31T05:31:55.538992+00:00', '2026-09-09T07:06:15.184+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('148fe49b-f898-4612-b557-1d0bde143b57', '082526-IOUDQIGF', '1064642', 'spvr-michael', 'MA. ARJEN COMAHIG', 'SAN JOSE 1, LABOGON MANDAUE CITY', 'SAN JOSE 1, LABOGON MANDAUE CITY', 'MA. ARJEN COMAHIG', NULL, 'Mandaue City', 306, 73, 'RS3', 1, '941', 10, 833, 0, 0, 'VERIFIED', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', ''',941,,491,,914,,194,,419,,149,''', NULL, '21', '2026-08-25T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260909-747456', '2026-08-29T04:32:15.450641+00:00', '2026-09-09T07:06:15.184+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('c58a5842-f04c-4c1e-98a6-813a6f4d71b7', '082526-OUAIIOFW', '1039929', 'spvr-arlfred', 'ROSEMARIE SANORIA', 'LOOC MANDAUE CITY', 'MANDAUE CITY', 'ROSEMARIE SANORIA', NULL, 'Mandaue City', 196, 71, 'TS3', 0, '726', 3, 1500, 0, 0, 'VERIFIED', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', NULL, NULL, '17', '2026-08-25T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260909-747456', '2026-08-28T05:31:51.456697+00:00', '2026-09-09T07:06:15.184+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('dfae4f08-9e9a-4d46-9d25-f1ab4ca5c7d7', '082426-UOEP8GRV', '914400', 'spvr-arlfred', 'MARY GRACE SUPERAL', 'CAMBARO, MANDAUE CITY', 'MANDAUE CITY', 'MARY GRACE, SUPERAL', NULL, 'Mandaue City', 119, 67, 'RS3', 1, '543', 10, 833, 0, 0, 'VERIFIED', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', ''',543,,453,,534,,354,,435,,345,''', NULL, '21', '2026-08-24T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260909-747456', '2026-08-30T03:52:37.449239+00:00', '2026-09-09T07:06:15.184+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('bc93c8c4-e3ff-4d74-b8c1-a5f2524c8c88', '090126-IEANHR84', '1779706', 'spvr-jason', 'JUDY ANN FUENTES', 'TIPOLO, MANDAUE CITY', 'MANDAUE CITY', 'JUDY ANN FUENTES', '30', 'Mandaue City', NULL, NULL, 'RS3', 0, '297', 10, 833, 0, 833, 'VERIFIED', 416.5, 249.9, 83.3, 83.3, NULL, 0, 1, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, '17', '2026-09-01 00:00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260911-689599', '2026-09-06T04:41:48.061035+00:00', '2026-09-11T04:00:00+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('cc3a446f-941c-4b9a-9d5f-06404a11db96', '081626-OIIRA0CN', '45210', 'spvr-carl', 'BARDAGU, DAPHNIE', 'IBABAO-ESTANCIA, MANDAUE CITY', 'MANDAUE CITY', 'BARDAGU, DAPHNIE', NULL, 'Mandaue City', 263, 17, 'TS3', 0, '784', 10, 5000, 0, 0, 'NO_RECEIPT', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', NULL, NULL, '17', '2026-08-16T00:00:00+00:00', TRUE, '{"reason":"Wala na scan ang cesibo, paso na at hindi na makita.","installments":[{"id":1,"status":"PAID, QUENNIE LIM","dueDate":"2026-08-26","amountDue":"500.00"},{"id":2,"status":"Pending","dueDate":"","amountDue":"500.00"},{"id":3,"status":"Pending","dueDate":"","amountDue":"500.00"},{"id":4,"status":"Pending","dueDate":"","amountDue":"500.00"},{"id":5,"status":"Pending","dueDate":"","amountDue":"500.00"},{"id":6,"status":"Pending","dueDate":"","amountDue":"500.00"},{"id":7,"status":"Pending","dueDate":"","amountDue":"500.00"},{"id":8,"status":"Pending","dueDate":"","amountDue":"500.00"},{"id":9,"status":"Pending","dueDate":"","amountDue":"500.00"},{"id":10,"status":"Pending","dueDate":"","amountDue":"500.00"}]}'::jsonb, 5000, 'PARTIAL', NULL, '2026-08-22T15:34:14.757229+00:00', '2026-08-22T15:34:14.757229+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('9973f794-3b47-4190-a985-d8d615edb57a', '082826-UAEVIPTU', '1360208', 'spvr-roel', 'CAMANCE, MARILOU', 'BASAK, MANDAUE CITY', 'MANDAUE CITY', 'CAMANCE, MARILOU', '23', 'Mandaue City', NULL, NULL, 'RS3', 0, '371', 10, 833, 0, 833, 'VERIFIED', 416.5, 249.9, 83.3, 83.3, NULL, 0, 1, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, '19', '2026-08-28 00:00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260909-747456', '2026-09-01T04:00:00+00:00', '2026-09-09T07:06:15.184+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('a03ef681-3137-43dd-be85-a14cb65ece8c', '083026-OIULAVDS', '1563303', 'spvr-carl', 'LABORES, RITCHELLEN', 'IBABAO-ESTANCIA, MANDAUE CITY', 'MANDAUE CITY', 'LABORES, RITCHELLEN', '27', 'Mandaue City', NULL, NULL, 'RS3', 0, '489', 3, 250, 0, 250, 'VERIFIED', 125, 75, 25, 25, NULL, 0, 1, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, '14', '2026-08-30 00:00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260911-689599', '2026-09-04T03:40:29.954292+00:00', '2026-09-11T04:00:00+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('d9991b21-626d-4352-b676-a9837f9b8471', '083126-UAO6VO58', '1666862', 'spvr-arlfred', 'MICHELLE QUINTO', 'GUIZO MANDAUE CITY', 'MANDAUE CITY', 'MICHELLE QUINTO', '21', 'Mandaue City', NULL, NULL, 'RS3', 0, '641', 30, 2500, 0, 2500, 'VERIFIED', 1250, 750, 250, 250, NULL, 0, 1, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, '15', '2026-08-31 00:00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260911-689599', '2026-09-04T04:35:37.98795+00:00', '2026-09-11T04:00:00+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('2d1e0f57-7f15-4609-b0c9-7e082a3a75f9', '082126-UAI30S5S', '629790', 'spvr-eya', 'UMBAY, RICKA CHRISTELLE', 'CANDUMAN, MANDAUE CITY', 'MANDAUE CITY', 'UMBAY, RICKA CHRISTELLE', NULL, 'Mandaue City', 104, 47, 'TS3', 0, '423', 10, 5000, 0, 0, 'NO_RECEIPT', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', NULL, NULL, '17', '2026-08-21T00:00:00+00:00', TRUE, '{"reason":"The agent did not follow the standard ticket verification policy; the claim was submitted to the office without the original physical receipt, preventing system scanning.","frequency":"weekly","installments":[{"id":1,"status":"Pending","dueDate":"2026-09-05","amountDue":"200.00"},{"id":2,"status":"Pending","dueDate":"2026-09-12","amountDue":"200.00"},{"id":3,"status":"Pending","dueDate":"2026-09-19","amountDue":"200.00"},{"id":4,"status":"Pending","dueDate":"2026-09-26","amountDue":"200.00"},{"id":5,"status":"Pending","dueDate":"2026-10-03","amountDue":"200.00"},{"id":6,"status":"Pending","dueDate":"2026-10-10","amountDue":"200.00"},{"id":7,"status":"Pending","dueDate":"2026-10-17","amountDue":"200.00"},{"id":8,"status":"Pending","dueDate":"2026-10-24","amountDue":"200.00"},{"id":9,"status":"Pending","dueDate":"2026-10-31","amountDue":"200.00"},{"id":10,"status":"Pending","dueDate":"2026-11-07","amountDue":"200.00"},{"id":11,"status":"Pending","dueDate":"2026-11-14","amountDue":"200.00"},{"id":12,"status":"Pending","dueDate":"2026-11-21","amountDue":"200.00"},{"id":13,"status":"Pending","dueDate":"2026-11-28","amountDue":"200.00"},{"id":14,"status":"Pending","dueDate":"2026-12-05","amountDue":"200.00"},{"id":15,"status":"Pending","dueDate":"2026-12-12","amountDue":"200.00"},{"id":16,"status":"Pending","dueDate":"2026-12-19","amountDue":"200.00"},{"id":17,"status":"Pending","dueDate":"2026-12-26","amountDue":"200.00"},{"id":18,"status":"Pending","dueDate":"2027-01-02","amountDue":"200.00"},{"id":19,"status":"Pending","dueDate":"2027-01-09","amountDue":"200.00"},{"id":20,"status":"Pending","dueDate":"2027-01-16","amountDue":"200.00"},{"id":21,"status":"Pending","dueDate":"2027-01-23","amountDue":"200.00"},{"id":22,"status":"Pending","dueDate":"2027-01-30","amountDue":"200.00"},{"id":23,"status":"Pending","dueDate":"2027-02-06","amountDue":"200.00"},{"id":24,"status":"Pending","dueDate":"2027-02-13","amountDue":"200.00"},{"id":25,"status":"Pending","dueDate":"2027-02-20","amountDue":"200.00"}],"installmentsCount":25}'::jsonb, 5000, 'PARTIAL', NULL, '2026-08-29T06:03:40.260484+00:00', '2026-09-13T00:43:17.366+00:00', 'PENDING_ADMIN_APPROVAL', 'Winning ticket has been claimed in the system. Requesting deletion and deduction from collections.', 'Jay Ryan Lim', '2026-09-13T00:43:17.366+00:00', NULL, 'HardCopy_Ticket_082126-UAI30S5S_1789260896822.jpg', 'HardCopy_Ticket_082126-UAI30S5S_1789260896822.jpg', NULL, NULL, NULL, NULL, NULL),
  ('07067b6c-717e-41b4-810a-570d7b8fe2ba', '091126-AEE1VEG4', '2856050', 'spvr-roel', 'BACASMAS, HOLLY', 'JAGOBIAO, MANDAUE CITY', 'MANDAUE CITY', 'BACASMAS, HOLLY', '23', 'Mandaue City', NULL, NULL, 'RS3', 0, '286', 10, 833, 0, 833, 'NO_RECEIPT', 416.5, 249.9, 83.3, 83.3, NULL, 0, 1, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, '17', '2026-09-11 00:00:00', FALSE, NULL, NULL, 'PENDING', NULL, '2026-09-14T05:17:03.939041+00:00', '2026-09-14T05:17:03.939041+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('75c09cba-09c2-44b1-86b2-362050302f89', '090426-AEISH1BN', '2145918', 'spvr-jed', 'LAURENCIA CABATUAN', 'CANDUMAN, MANDAUE CITY', 'MANDAUE CITY', 'LAURENCIA CABATUAN', '28', 'Mandaue City', NULL, NULL, 'RS3', 0, '472', 10, 833, 0, 833, 'VERIFIED', 416.5, 249.9, 83.3, 83.3, NULL, 0, 1, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, '21', '2026-09-04 00:00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-260911-689599', '2026-09-08T05:15:33.529953+00:00', '2026-09-11T04:00:00+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('3d2a6a8f-b683-4abc-9f07-431552ad2a9a', '082326-IOECSCIH', '837113', 'spvr-joel', 'MARIA CORAZON TORENO', 'MANDAUE', 'MANDAUE', 'MARIA CORAZON TORENO', '25', 'Mandaue City', NULL, NULL, 'RS3', 0, '582', 15, 1250, 0, 1250, 'NO_RECEIPT', 625, 375, 125, 125, NULL, 0, 1, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, '17', '2026-08-23 00:00:00', TRUE, '{"reason":"The agent failed to scan the winning ticket on time, and no original physical receipt was presented for terminal verification.","frequency":"weekly","sub_office":"Mandaue Central","signatories":{"claimant":"MARIA CORAZON TORENO","hrManager":"quennie capuyan","supervisor":"joel estorco"},"installments":[{"id":1,"status":"","dueDate":"2026-09-09","amountDue":"200.00"},{"id":2,"status":"","dueDate":"2026-09-16","amountDue":"200.00"},{"id":3,"status":"","dueDate":"2026-09-23","amountDue":"200.00"},{"id":4,"status":"","dueDate":"2026-09-30","amountDue":"200.00"},{"id":5,"status":"","dueDate":"2026-10-07","amountDue":"200.00"},{"id":6,"status":"","dueDate":"2026-10-14","amountDue":"200.00"},{"id":7,"status":"","dueDate":"2026-10-21","amountDue":"50.00"}],"agreementDate":"2026-09-02","installmentsCount":7}'::jsonb, 1250, 'PARTIAL', NULL, '2026-09-02T03:23:42.635194+00:00', '2026-09-02T03:25:30.713+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('ca2aad6c-2934-4d2e-b7e3-78d9beb35351', '082026-UOIMITEJ', '541999', 'spvr-joel', 'FLORES, NINAMARIE', 'MANDAUE CITY', 'MANDAUE CITY', 'FLORES, NINAMARIE', '25', 'Mandaue City', 188, 43, 'RS3', 1, '972', 5, 417, 0, 0, 'PENDING_VERIFICATION', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', ''',972,,792,,927,,297,,729,,279,''', NULL, '21', '2026-08-20T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-082626-747465', '2026-08-23T05:10:24.30911+00:00', '2026-09-01T04:21:28.609+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('ce580207-f67e-4956-a538-076f932959e5', '082326-UEOB1FTA', '787663', 'spvr-michael', 'SOON, CHERYL', 'PAKNAAN, MANDAUE CITY', 'MANDAUE CITY', 'SOON, CHERYL', '24', 'Mandaue City', 245, 57, 'RS3', 1, '672', 5, 417, 0, 0, 'PENDING_VERIFICATION', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', ''',672,,762,,627,,267,,726,,276,''', NULL, '14', '2026-08-23T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-082626-747465', '2026-08-25T04:27:06.603252+00:00', '2026-09-01T04:21:28.609+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('d5cdc6fc-48ae-4225-9b96-f41a15113027', '082126-AIEUK6TP', '633479', 'spvr-jason', 'JUDY ANN FUENTES', 'TIPOLO, MANDAUE CITY', 'MANDAUE CITY', 'JUDY ANN FUENTES', '30', 'Mandaue City', 88, 47, 'RS3', 1, '324', 50, 4167, 0, 0, 'PENDING_VERIFICATION', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', ''',324,,234,,342,,432,,243,,423,''', NULL, '17', '2026-08-21T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-082626-747465', '2026-08-23T04:29:47.501267+00:00', '2026-09-01T04:21:28.609+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('fadd887e-fde4-46a5-a24a-f0095d60ce8a', '081726-EOELNEFJ', '219081', 'spvr-eya', 'BACASON, BELLA', 'CANDUMAN, MANDAUE CITY', 'MANDAUE CITY', 'BACASON, BELLA', '26', 'Mandaue City', 53, 25, 'RS3', 1, '850', 10, 833, 0, 0, 'PENDING_VERIFICATION', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', ''',850,,580,,805,,085,,508,,058,''', NULL, '21', '2026-08-17T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-082626-747465', '2026-08-24T05:01:42.674068+00:00', '2026-09-01T04:21:28.609+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('fc9fd2d4-8511-44f8-a1f0-43ab1062b969', '082026-UAU0OGUY', '545311', 'spvr-roel', 'GARAN, ANALIZA', 'CANDUMAN, MANDAUE CITY', 'MANDAUE CITY', 'GARAN, ANALIZA', '23', 'Mandaue City', 46, 43, 'RS3', 1, '792', 10, 833, 0, 0, 'PENDING_VERIFICATION', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', ''',792,,972,,729,,279,,927,,297,''', NULL, '21', '2026-08-20T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-082626-747465', '2026-08-23T03:57:22.402103+00:00', '2026-09-01T04:21:28.609+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('1fa054ee-c400-4c8b-ac7c-dd71823498cb', '081626-OIAC4DXG', '38812', 'spvr-jed', 'HERRERO, JOCELYN', 'PAGSABUNGAN, MANDAUE CITY', 'MANDAUE CITY', 'HERRERO, JOCELYN', '28', 'Mandaue City', 201, 15, 'RS3', 1, '569', 10, 833, 0, 0, 'PENDING_VERIFICATION', 0, 0, 0, 0, NULL, 0, 1, '1', '0', '0', 0, NULL, 0, NULL, NULL, '0', ''',569,,659,,596,,956,,695,,965,''', NULL, '14', '2026-08-16T00:00:00+00:00', FALSE, NULL, NULL, 'PENDING', 'MAN-082626-747465', '2026-08-21T15:51:38.96409+00:00', '2026-09-01T04:21:28.609+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT ("transactionId") DO NOTHING;

DROP TABLE IF EXISTS public.settlement_payments CASCADE;

CREATE TABLE public.settlement_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "returnedWinningsId" UUID REFERENCES public.returned_winnings(id) ON DELETE CASCADE,
    "installmentNumber" INTEGER,
    "paymentAmount" NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    "paymentDate" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    "receivedBy" TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_settlement_payments_returned_id ON public.settlement_payments("returnedWinningsId");
CREATE INDEX IF NOT EXISTS idx_settlement_payments_date ON public.settlement_payments("paymentDate" DESC);

ALTER TABLE public.settlement_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to settlement_payments for anon/authenticated" ON public.settlement_payments;
CREATE POLICY "Allow all access to settlement_payments for anon/authenticated"
ON public.settlement_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.settlement_payments REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.settlement_payments; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

INSERT INTO public.settlement_payments (id, "returnedWinningsId", "installmentNumber", "paymentAmount", "paymentDate", "receivedBy", notes, created_at)
VALUES
  ('5bd7a3a7-4662-4d35-a463-aa7ec7f9f90e', 'cc3a446f-941c-4b9a-9d5f-06404a11db96', NULL, 500, '2026-09-01T00:00:00+00:00', 'Jay Ryan Lim', 'First Installment', '2026-09-01T07:10:30.574341+00:00'),
  ('c5b6c233-1708-4f35-868c-04d247ad89e7', '3d2a6a8f-b683-4abc-9f07-431552ad2a9a', NULL, 200, '2026-09-06T00:00:00+00:00', 'QUENNIE CAPUYAN LIM', 'FIRST PAYMENT', '2026-09-06T03:46:09.281896+00:00')
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS public.remittance_receipts CASCADE;

CREATE TABLE public.remittance_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_serial_no TEXT,
    sub_office TEXT NOT NULL REFERENCES public.sub_offices(name) ON UPDATE CASCADE,
    uploaded_by_user TEXT NOT NULL,
    payment_channel TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    sender_name TEXT,
    sender_mobile TEXT,
    bank_name TEXT,
    remittance_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    deposited_charges NUMERIC(15, 2) DEFAULT 0.00,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_image_url TEXT,
    verification_status TEXT NOT NULL DEFAULT 'PENDING',
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    tickets_count INTEGER DEFAULT 1,
    affected_transaction_ids TEXT[],
    batch_type TEXT DEFAULT 'INDIVIDUAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_remittance_receipts_batch_serial ON public.remittance_receipts(batch_serial_no);
CREATE INDEX IF NOT EXISTS idx_remittance_receipts_status ON public.remittance_receipts(verification_status);
CREATE INDEX IF NOT EXISTS idx_remittance_receipts_sub_office ON public.remittance_receipts(sub_office);

ALTER TABLE public.remittance_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to remittance_receipts for anon/authenticated" ON public.remittance_receipts;
CREATE POLICY "Allow all access to remittance_receipts for anon/authenticated"
ON public.remittance_receipts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.remittance_receipts REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.remittance_receipts; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

INSERT INTO public.remittance_receipts (id, batch_serial_no, sub_office, uploaded_by_user, payment_channel, reference_number, sender_name, sender_mobile, bank_name, remittance_amount, receipt_date, receipt_image_url, verification_status, verified_by, verified_at, rejection_reason, notes, tickets_count, affected_transaction_ids, batch_type, created_at, deposited_charges)
VALUES
  ('8f7673a4-768e-4b39-b49c-b8e47c6c2f92', 'MAN-082626-747465', 'Mandaue City', 'ssr-ryan@stl.com', 'BANK_DEPOSIT', '01111289605142B6013', 'Jay Ryan Lim', '09360291943', 'BDO Unibank', 7500, '2026-08-26', '3.jpg', 'VERIFIED', 'Aizah COndrado', '2026-09-02T02:46:40.563+00:00', NULL, 'Deposited for Month of August - luckybetplay (BDO Davao C.M. Recto)', 6, NULL, 'INDIVIDUAL', '2026-09-01T04:21:28.202347+00:00', 20),
  ('cd810244-9d4d-4e11-9fe0-897de07864a2', 'MAN-260909-747456', 'Mandaue City', 'yuki@stl.com', 'BANK_DEPOSIT', '0111128950170P1043', 'Aizah Condrado', NULL, 'BDO Unibank', 22998, '2026-09-08', '2.jpg', 'VERIFIED', 'Aizah Condrado', '2026-09-09T13:50:32.693+00:00', NULL, 'Batch Remittance for Serial MAN-260909-747456 (11 tickets - BDO Davao C.M. Recto)', 11, NULL, 'INDIVIDUAL', '2026-09-09T07:06:13.984872+00:00', 0),
  ('090fa014-b175-42e2-ae33-c88e4c3bdfa7', 'MAN-260911-689599', 'Mandaue City', 'ssr-ryan@stl.com', 'GCASH', '1044919136722', 'Jay Ryan Lim', '09360291943', 'BDO Unibank, Inc.', 5249, '2026-09-11', '1.jpg', 'VERIFIED', 'Aizah Condrado', '2026-09-11T01:54:47.927+00:00', NULL, 'Unclaimed Winning Deposit - Transferred to BDO Morsid Simpal (InstaPay Ref: 1044919136722)', 5, NULL, 'INDIVIDUAL', '2026-09-11T01:48:21.117104+00:00', 10)
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;

CREATE TABLE public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_pending_token UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_pw_reset_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_pw_reset_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pw_reset_used ON public.password_reset_tokens(used);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to password_reset_tokens for anon/authenticated" ON public.password_reset_tokens;
CREATE POLICY "Allow all access to password_reset_tokens for anon/authenticated"
ON public.password_reset_tokens FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.password_reset_tokens REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_tokens; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

INSERT INTO public.password_reset_tokens (id, user_id, username, token, email, expires_at, used, used_at, created_at)
VALUES
  ('9da6ff72-f85c-43a5-ad82-2fa79bb4e60f', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'ssr-ryan@stl.com', 'i99oP3C4h0MPwOLExz1pvHEg4Fg2ZZuzLGYKbIsXREHTi9sG5dH9Dpj2Gtgdbul3', 'itreports.company@gmail.com', '2026-09-06T09:21:28.378+00:00', TRUE, '2026-09-06T08:56:51.291+00:00', '2026-09-06T08:51:28.582+00:00'),
  ('a6891f08-3848-4f30-86cc-e3b5d50e19ac', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'admin', 'Drot2MoH5t9zEYaC3tBchuasuiM8DUc6kmqds0eQXTAXPTJCS40YVMOpkecD1YZU', 'xxlordshin@gmail.com', '2026-09-06T12:20:59.167+00:00', TRUE, '2026-09-06T11:51:40.316+00:00', '2026-09-06T11:50:59.463+00:00'),
  ('ca8c8dd1-ee78-46c3-b5bb-92cdd0f29e74', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'yuki@stl.com', 'AJybwVtzfqv8YnX0MwG9WzoiH7pxV2gjGcvBsCpBvA9dfVd3xTZe3RiFtrhqaZWq', 'aisahcondrado@gmail.com', '2026-09-07T02:40:05.207+00:00', TRUE, '2026-09-07T02:11:57.526+00:00', '2026-09-07T02:10:05.495+00:00')
ON CONFLICT (token) DO NOTHING;

DROP TABLE IF EXISTS public.ticket_verification_chats CASCADE;

CREATE TABLE public.ticket_verification_chats (
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
    ocr_data JSONB,
    verification_status TEXT NOT NULL DEFAULT 'PENDING',
    matched_transaction_id TEXT,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tv_chats_status ON public.ticket_verification_chats(verification_status);
CREATE INDEX IF NOT EXISTS idx_tv_chats_created ON public.ticket_verification_chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tv_chats_trans_id ON public.ticket_verification_chats(matched_transaction_id);
CREATE INDEX IF NOT EXISTS idx_tv_chats_room_id ON public.ticket_verification_chats(room_id);
CREATE INDEX IF NOT EXISTS idx_tv_chats_recipient_id ON public.ticket_verification_chats(recipient_id);

ALTER TABLE public.ticket_verification_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to ticket_verification_chats for anon/authenticated" ON public.ticket_verification_chats;
CREATE POLICY "Allow all access to ticket_verification_chats for anon/authenticated"
ON public.ticket_verification_chats FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.ticket_verification_chats REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_verification_chats; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

INSERT INTO public.ticket_verification_chats (id, sender_id, sender_name, sender_role, sub_office, recipient_id, recipient_name, room_id, message_text, image_url, ocr_data, verification_status, matched_transaction_id, verified_by, verified_at, rejection_reason, is_archived, created_at)
VALUES
  ('357241bb-3e45-4de3-bb64-4a60c251d381', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'Reymark Suan', 'Admin', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_admin__ssr-ryan@stl.com', 'try mo chat si maam quen', NULL, '{"roomId":"dm_admin__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"admin"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-08T08:25:17.263+00:00'),
  ('b26c6f3f-ac53-4b58-b2a6-94a3bc01f2fc', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'maam yuks?', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:52:55.12+00:00'),
  ('cc57e8ba-80d8-461c-9890-4de8d45548ea', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'pa send deposit slip', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:53:43.901+00:00'),
  ('66a82d1c-bfce-4797-ae7e-8c7c59450f42', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'ikaw nalang po sir hehe', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":{"id":"50137d8e-6239-449c-8103-c9f3a63bf2ce","image_url":null,"sender_name":"Jay Ryan Lim","message_text":"okay po maam yuks, ikaw na claim ?"},"groupName":null,"reactions":{"❤️":["ssr-ryan@stl.com"]},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:19:06.221+00:00'),
  ('97e4723a-9b3a-4646-81f9-923cd67321fb', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'Reymark Suan', 'Admin', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_admin__ssr-ryan@stl.com', 'ma chat mo na siya', NULL, '{"roomId":"dm_admin__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"admin"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-08T08:25:22.607+00:00'),
  ('5e9381a9-9d5f-4cd5-864b-005f2564ed1c', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'Goodmorning', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:53:05.976+00:00'),
  ('3aeab60f-8b92-41b4-b60d-d959b0d2a7fb', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'may ipa approved ako sa iyo, verify mo lang ehehe', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:53:36.848+00:00'),
  ('d7f57525-fb4f-48a0-b884-a9e0c5789b49', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'okeemmss', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:53:57.564+00:00'),
  ('9b20729d-6f87-4ef2-ad87-08cc69d68592', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 's', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:55:20.61+00:00'),
  ('a3d905c5-1c96-445d-a09d-68edea9623cb', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', NULL, NULL, 'group-all-branches-ssr', 'sir Suan pahingi dashboard ng Mandaue pleasee', NULL, '{"roomId":"group-all-branches-ssr","isGroup":true,"reply_to":null,"groupName":"All Branches SSR Desk","reactions":{},"recipient_id":null,"recipient_name":null,"sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:19:42.837+00:00'),
  ('26991b8e-a5a8-4917-959b-82583a5cd001', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'Reymark Suan', 'Admin', 'stl-mandaue', NULL, NULL, 'group-all-branches-ssr', 'everyone', NULL, '{"roomId":"group-all-branches-ssr","isGroup":true,"reply_to":null,"groupName":"All Branches SSR Desk","reactions":{},"recipient_id":null,"recipient_name":null,"sender_username":"admin"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-08T08:47:57.512+00:00'),
  ('b210b016-35a6-43d0-b163-05ad01c29680', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'Good morning sirrrr', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:53:33.251+00:00'),
  ('417ebdf8-c416-4214-b1c9-75b21ca36fe7', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'Thank you sa inyo ni Maam Kwen sirrr', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{"❤️":["ssr-ryan@stl.com"]},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:19:56.856+00:00'),
  ('55d17b70-1ceb-4554-85c0-91b890eb0ad4', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', NULL, NULL, 'group-all-branches-ssr', 'tsssss', NULL, '{"roomId":"group-all-branches-ssr","isGroup":true,"reply_to":null,"groupName":"All Branches SSR Desk","reactions":{},"recipient_id":null,"recipient_name":null,"sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:01:30.329+00:00'),
  ('cf3727e6-a93a-4871-8c85-6c9d17646da3', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'na send ko na sa gc maam ehehe', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:53:47.392+00:00'),
  ('c321926a-f86a-47bb-bef2-9d868fc20f47', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'gusto mo send ko dito?', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:53:56.72+00:00'),
  ('e8b3ef04-cc1b-485d-9da8-2faf52c5fca4', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'okay na sir', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:55:15.897+00:00'),
  ('7ed6181b-bb87-43aa-934a-aac3cfdc9321', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'basta ikaw maam kurog mi', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{"😂":["yuki@stl.com"]},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:19:58.833+00:00'),
  ('306d7ba2-2cc9-4815-91f6-a5227c3e5aba', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'hahahahaha bisaya kaayo ka sir ba', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:20:33.354+00:00'),
  ('fd712d9c-3ab2-44ea-9d2e-c09dd03b46c6', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'Reymark Suan', 'dm_admin__ssr-ryan@stl.com', 'bakit nanaman tsss', NULL, '{"roomId":"dm_admin__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"27dfca93-b28c-4422-85b9-8c6a0b5d8671","recipient_name":"Reymark Suan","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:01:49.931+00:00'),
  ('09175018-fa8d-4dfe-b19e-ccd4638c5a8e', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'Reymark Suan', 'dm_admin__ssr-ryan@stl.com', 'magkalimtanay nalang ta uy', NULL, '{"roomId":"dm_admin__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"27dfca93-b28c-4422-85b9-8c6a0b5d8671","recipient_name":"Reymark Suan","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:01:56.356+00:00'),
  ('a5152fc9-ddd2-4cde-9787-4d5481d9ad04', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', '2587328b-0938-4b26-8afe-4a239f7bd7fb', 'Quennie Lim', 'dm_qwyn__ssr-ryan@stl.com', 'Hon', NULL, '{"roomId":"dm_qwyn__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"2587328b-0938-4b26-8afe-4a239f7bd7fb","recipient_name":"Quennie Lim","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:02:16.791+00:00'),
  ('7cc88d45-c9ed-458f-b84c-7f30c1bcc015', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'ayaw na sir', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:55:11.305+00:00'),
  ('ec940d23-a2d4-47c9-ab75-8b6e21c8d5ac', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'okay na yon', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:55:13.858+00:00'),
  ('4c580f49-12f9-4989-bfec-9af93b5734d9', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'approved na po', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{"❤️":["ssr-ryan@stl.com"]},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:55:23.896+00:00'),
  ('f99006a4-4e2d-4fe1-837a-748113fbac23', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'thank you sir', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{"❤️":["ssr-ryan@stl.com"]},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:55:43.656+00:00'),
  ('65a21ad2-82c2-4d94-a5d6-eee00b3a0052', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'practice, pero gusto ko puro trashtalk lang matutunan ko ahahaha', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":{"id":"306d7ba2-2cc9-4815-91f6-a5227c3e5aba","image_url":null,"sender_name":"Aizah Condrado","message_text":"hahahahaha bisaya kaayo ka sir ba"},"groupName":null,"reactions":{"😂":["yuki@stl.com"]},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:21:22.906+00:00'),
  ('bb6d2cdf-414a-4bb3-8e14-20bac88a1f6b', '2587328b-0938-4b26-8afe-4a239f7bd7fb', 'Quennie Lim', 'Sales Service Representative', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_qwyn__ssr-ryan@stl.com', 'baliw ka hon', NULL, '{"roomId":"dm_qwyn__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"qwyn"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:12:19.967+00:00'),
  ('28df43a5-5782-4a63-9b02-c56b45d0c4d5', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'a', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:55:17.125+00:00'),
  ('e4ec94b5-b2fb-4d6f-8bbb-2fd035e3346a', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', NULL, NULL, 'group-all-branches-ssr', NULL, NULL, '{"code":null,"draw":null,"agent":null,"roomId":"group-all-branches-ssr","company":"Lucky Betplay Corporation - STL Mandaue","isGroup":true,"qrFound":false,"rawText":"Lod 14213444\ny ~ > Y [simon\nWELCOME BACK\nLUCKY BETPLAY Login Account\n—_ CORPORATION ee ]\nUsername\nmandaue staff\nPassword\n8 abc123\nhess EE Forget cassword?\nProtected\n~\n","success":true,"reply_to":null,"totalBet":null,"groupName":"All Branches SSR Desk","qrRawData":null,"reactions":{},"confidence":54,"dateTimeStr":null,"combinations":[],"recipient_id":null,"originalImage":"","transactionId":null,"recipient_name":null,"sender_username":"ssr-ryan@stl.com"}'::jsonb, 'PENDING', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:22:21.57+00:00'),
  ('2d0e4786-0a5f-447e-aaa5-7fc12ec1d42a', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', '2587328b-0938-4b26-8afe-4a239f7bd7fb', 'Quennie Lim', 'dm_qwyn__ssr-ryan@stl.com', 'hi, sephy', NULL, '{"roomId":"dm_qwyn__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"2587328b-0938-4b26-8afe-4a239f7bd7fb","recipient_name":"Quennie Lim","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:12:36.21+00:00'),
  ('6e15a866-d373-4b1f-afb5-347416c833d7', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'nasa undersettlement yan siya', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:58:21.489+00:00'),
  ('418505db-34c7-4d44-b652-b629003fa96d', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', NULL, NULL, '{"code":"082126-UAI30868","draw":"5PM","agent":null,"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","company":"Lucky Betplay Corporation - STL Mandaue","isGroup":false,"qrFound":false,"rawText":"BRYBLAY CORPORA .\n~ RRA core\nGEN? : UMBAY, RICKA\nHRIS TELLE |\nPATE/ TIME : Aug-21-26 16:36\nDRAW : 5PM\nODE : 082126-UAI30868\nNumber Amount Win\n783423 10 5000\nTS3-045 10 5000\nTotal: 20.00\n\\ OLAIM WITHIN 1 YEAR; ies,\n. PRIZE i FORFEITED.\ni au ad pe a\n: Rx RE \" a i |\n","success":true,"reply_to":null,"totalBet":20,"groupName":null,"qrRawData":null,"reactions":{},"confidence":58,"dateTimeStr":null,"combinations":[{"win":5000,"type":"TS3","amount":10,"number":"045"}],"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","originalImage":"","transactionId":"082126-UAI30868","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'VERIFIED', '082126-UAI30868', 'Aizah Condrado (stl-mandaue)', '2026-09-11T02:02:36.992+00:00', NULL, FALSE, '2026-09-11T01:58:04.544+00:00'),
  ('e912c2b1-8f90-4e3a-8d1a-90a19a6d56a4', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', NULL, NULL, 'group-all-branches-ssr', 'yan ba maam yuks>', NULL, '{"roomId":"group-all-branches-ssr","isGroup":true,"reply_to":null,"groupName":"All Branches SSR Desk","reactions":{},"recipient_id":null,"recipient_name":null,"sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:22:30.05+00:00'),
  ('b3043995-a4a5-49cd-916e-c848005378a9', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', NULL, NULL, 'group-all-branches-ssr', 'busy ata bestfriend mo ahahaha', NULL, '{"roomId":"group-all-branches-ssr","isGroup":true,"reply_to":null,"groupName":"All Branches SSR Desk","reactions":{"😂":["admin"]},"recipient_id":null,"recipient_name":null,"sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:22:44.906+00:00'),
  ('76ca1e3c-d8b8-41c4-8f8a-0676145e470e', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', '2587328b-0938-4b26-8afe-4a239f7bd7fb', 'Quennie Lim', 'dm_qwyn__ssr-ryan@stl.com', 'okay ka lang?', NULL, '{"roomId":"dm_qwyn__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"2587328b-0938-4b26-8afe-4a239f7bd7fb","recipient_name":"Quennie Lim","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:12:49.788+00:00'),
  ('a3a180ef-bf0f-4151-a593-0c4b9b17adbb', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'e consider niyo yang picture niya?', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:58:51.744+00:00'),
  ('88a4f075-7182-4420-8e07-254131b836af', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', NULL, NULL, 'group-all-branches-ssr', '?', NULL, '{"roomId":"group-all-branches-ssr","isGroup":true,"reply_to":null,"groupName":"All Branches SSR Desk","reactions":{},"recipient_id":null,"recipient_name":null,"sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:22:33.098+00:00'),
  ('55e8da5c-facc-446b-ac14-7da6f039b6c6', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'Reymark Suan', 'dm_admin__ssr-ryan@stl.com', 'okay na reliable na ang indicators. goods na.', NULL, '{"roomId":"dm_admin__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"27dfca93-b28c-4422-85b9-8c6a0b5d8671","recipient_name":"Reymark Suan","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:14:02.503+00:00'),
  ('0027786e-3177-4fc1-8d60-1830e81fa39c', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'ngano iya manang gi sulatan hahahaha', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:00:43.782+00:00'),
  ('332f32ab-a99a-49fc-be7f-00167ed8e16b', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'Reymark Suan', 'Admin', 'Mandaue Central HQ', NULL, NULL, 'group-all-branches-ssr', 'haha sino ba yan kasi', NULL, '{"roomId":"group-all-branches-ssr","isGroup":true,"reply_to":null,"groupName":"All Branches SSR Desk","reactions":{},"recipient_id":null,"recipient_name":null,"sender_username":"admin"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T06:10:14.123+00:00'),
  ('0ae5b279-ba68-4b8f-8fde-10871733672d', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', '🎟️', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:18:49.304+00:00'),
  ('459dbf85-e8b2-4295-89b1-14e780fa09d0', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'pwede pa yan sir', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:01:07.468+00:00'),
  ('618a970e-954b-402f-a9e5-f80fbbdd8e9d', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'Mandaue City', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'maam yuks pa suyo ako maam sa deletion maam ehehe', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-15T01:04:11.016+00:00'),
  ('f120efee-6c5f-4475-8030-e0099aeab7a4', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'Reymark Suan', 'Admin', 'Mandaue Central HQ', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_admin__ssr-ryan@stl.com', 'hahah', NULL, '{"roomId":"dm_admin__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"admin"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:52:52.119+00:00'),
  ('89466307-41ad-49c3-bf5c-c50e6499d7e3', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'yan na siguro yung sa part ng printer niya maam, gi klaro niya. ..', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":{"id":"0027786e-3177-4fc1-8d60-1830e81fa39c","image_url":null,"sender_name":"Aizah Condrado","message_text":"ngano iya manang gi sulatan hahahaha"},"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:11:57.368+00:00'),
  ('659af54d-095a-41d6-8709-425d2b6a7e58', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'Mandaue City', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'request deletion po', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-15T01:04:24.527+00:00'),
  ('7dac42aa-bed2-482b-910f-ef04cce8e69e', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'Reymark Suan', 'Admin', 'Mandaue Central HQ', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_admin__ssr-ryan@stl.com', 'wagka nmn ganyan sakin sir', NULL, '{"roomId":"dm_admin__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{"😂":["ssr-ryan@stl.com"]},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"admin"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:53:04.44+00:00'),
  ('1c35f052-2772-42bc-b6c3-535d68a86e2e', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'naga strikto man kami dito ni kwenkwen, pinapa require namin ang resibo, lalo na yang mga na settle na or na returned na ang pera dito sa office.', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":{"id":"459dbf85-e8b2-4295-89b1-14e780fa09d0","image_url":null,"sender_name":"Aizah Condrado","message_text":"pwede pa yan sir"},"groupName":null,"reactions":{"❤️":["yuki@stl.com"]},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:13:10.136+00:00'),
  ('c0b8bdac-f0cf-4a1d-b90b-d18fbcd39a46', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'Mandaue City', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'Goodmorning', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-15T01:04:28.775+00:00'),
  ('747ee168-506c-4dcd-a393-81cc7b90abbb', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'Reymark Suan', 'Admin', 'Mandaue Central HQ', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_admin__ssr-ryan@stl.com', 'hahaha', NULL, '{"roomId":"dm_admin__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"admin"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-09T01:53:05.48+00:00'),
  ('285e88dd-1c13-415c-b4d2-5e2a3e5bdabf', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'itong case niya lang kay sobrang labo, reliever ang gumamit ng account na yan, then ang SPVR reliever din ahaha', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":{"id":"418505db-34c7-4d44-b652-b629003fa96d","image_url":"","sender_name":"Jay Ryan Lim","message_text":null},"groupName":null,"reactions":{"❤️":["yuki@stl.com"]},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:13:42.279+00:00'),
  ('ab2d5e41-11f8-431f-81e3-905e3c6fa9ce', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'maam yuks ang mga pending kay sir Molly at Apple na account, mga lotto outlet yan sila maam , kakausapin pa yan sila, kay mukhang hindi pa sila nakaka intindi medyo gahi pa. ehehe', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-10T04:00:41.72+00:00'),
  ('5585a0eb-33a2-4f7c-a130-b1f8c9600116', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'kaya pina bayad nalang ni maam quennie kay siya man nag settle, kaso may pina kita siya na resibo yan na. so wonder ako kung e approved niyo yan. ehehe', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{"❤️":["yuki@stl.com"]},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:14:41.368+00:00'),
  ('e7e6a932-b46a-452f-bfee-fd353beddf71', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', '2587328b-0938-4b26-8afe-4a239f7bd7fb', 'Quennie Lim', 'dm_qwyn__ssr-ryan@stl.com', 'hon?', NULL, '{"roomId":"dm_qwyn__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"2587328b-0938-4b26-8afe-4a239f7bd7fb","recipient_name":"Quennie Lim","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-10T04:01:00.632+00:00'),
  ('1f3976f1-fd3c-4093-96a5-e884a1fc2a84', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', '2587328b-0938-4b26-8afe-4a239f7bd7fb', 'Quennie Lim', 'dm_qwyn__ssr-ryan@stl.com', 'miss ko na si sephy', NULL, '{"roomId":"dm_qwyn__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"2587328b-0938-4b26-8afe-4a239f7bd7fb","recipient_name":"Quennie Lim","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-10T04:01:10.072+00:00'),
  ('beee3048-bb03-4355-bdff-255dc4c89250', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', '2587328b-0938-4b26-8afe-4a239f7bd7fb', 'Quennie Lim', 'dm_qwyn__ssr-ryan@stl.com', 'uwi tayo', NULL, '{"roomId":"dm_qwyn__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"2587328b-0938-4b26-8afe-4a239f7bd7fb","recipient_name":"Quennie Lim","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-10T04:01:15.416+00:00'),
  ('a25fdd83-368f-408f-896d-70a9280e5708', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'pwede pa po yan na ticket sir', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":{"id":"5585a0eb-33a2-4f7c-a130-b1f8c9600116","image_url":null,"sender_name":"Jay Ryan Lim","message_text":"kaya pina bayad nalang ni maam quennie kay siya man nag settle, kaso may pina kita siya na resibo yan na. so wonder ako kung e approved niyo yan. ehehe"},"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:16:39.256+00:00'),
  ('1400b2ea-bc55-4475-972e-5eb00ce25a54', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'okay po sir', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":{"id":"ab2d5e41-11f8-431f-81e3-905e3c6fa9ce","image_url":null,"sender_name":"Jay Ryan Lim","message_text":"maam yuks ang mga pending kay sir Molly at Apple na account, mga lotto outlet yan sila maam , kakausapin pa yan sila, kay mukhang hindi pa sila nakaka intindi medyo gahi pa. ehehe"},"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:02:17.381+00:00'),
  ('c998220f-1cb3-46dd-9c11-12f4e7dcd782', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'na approved ko na din poo', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:16:44.457+00:00'),
  ('98200097-62d6-4661-ae80-25e4e911805d', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'Unclaimed Specialist', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'okay po sir', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{"❤️":["ssr-ryan@stl.com"]},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"yuki@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T01:02:36.911+00:00'),
  ('50137d8e-6239-449c-8103-c9f3a63bf2ce', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'Sales Service Representative', 'stl-mandaue', 'd8f26528-a956-412d-8d3a-73e0076a38ce', 'Aizah Condrado', 'dm_ssr-ryan@stl.com__yuki@stl.com', 'okay po maam yuks, ikaw na claim ?', NULL, '{"roomId":"dm_ssr-ryan@stl.com__yuki@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"d8f26528-a956-412d-8d3a-73e0076a38ce","recipient_name":"Aizah Condrado","sender_username":"ssr-ryan@stl.com"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-11T02:16:54.377+00:00'),
  ('d543a582-f82c-4534-9318-6484c66fa27e', '27dfca93-b28c-4422-85b9-8c6a0b5d8671', 'Reymark Suan', 'Admin', 'stl-mandaue', '7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1', 'Jay Ryan Lim', 'dm_admin__ssr-ryan@stl.com', 'sir', NULL, '{"roomId":"dm_admin__ssr-ryan@stl.com","isGroup":false,"reply_to":null,"groupName":null,"reactions":{},"recipient_id":"7b7dad29-cb0a-4e1b-a84e-cccd07c88fd1","recipient_name":"Jay Ryan Lim","sender_username":"admin"}'::jsonb, 'INFO', NULL, NULL, NULL, NULL, FALSE, '2026-09-08T08:25:04.871+00:00')
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS public.audit_logs CASCADE;

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_username TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    sub_office TEXT REFERENCES public.sub_offices(name) ON UPDATE CASCADE,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to audit_logs for anon/authenticated" ON public.audit_logs;
CREATE POLICY "Allow all access to audit_logs for anon/authenticated"
ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

INSERT INTO public.audit_logs (id, actor_username, actor_role, action, target_type, target_id, sub_office, details, created_at)
VALUES
  ('4d388343-a12e-436a-a0fc-928bac8c6e9e', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:54:16.432893+00:00'),
  ('05d7e1e7-16e5-4bb3-bccd-e3f81d439c4d', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:54:40.232066+00:00'),
  ('c7a42ecd-8fbd-479e-a809-48a97e74e418', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:54:56.936691+00:00'),
  ('754d2edb-a13e-41ac-bee9-a9dd224dff61', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:55:39.140659+00:00'),
  ('18f351fd-b8f2-4b8e-b229-5bc61d6082da', 'admin', 'Admin', 'GATEWAY_CONFIGS_UPDATED', 'SYSTEM', 'GATEWAY_ENDPOINTS', NULL, '{"count":2}'::jsonb, '2026-09-12T04:06:26.063471+00:00'),
  ('30d51856-c872-477f-b792-7dcd449a3924', 'admin', 'Admin', 'GATEWAY_CONFIGS_UPDATED', 'SYSTEM', 'GATEWAY_ENDPOINTS', NULL, '{"count":2}'::jsonb, '2026-09-12T04:06:38.257204+00:00'),
  ('2b19cd44-c9c7-40ba-8285-6a27b9cd7991', 'yuki@stl.com', 'Unclaimed Specialist', 'BATCH_REMITTANCE_PROOF_ATTACHED', 'remittance_receipts', '420741d7-384c-4be4-b952-a6308fd9f757', 'Mandaue City', '{"amount":29080,"channel":"GCASH","batchSerial":"STL-260909-784003","ticketsCount":11,"referenceNumber":"01111289","depositedCharges":0}'::jsonb, '2026-09-09T01:34:07.123711+00:00'),
  ('4ac2ac67-b224-4a2a-a74c-1f6fe24d5f3d', 'admin', 'Admin', 'USER_UPDATED', 'USER', 'ssr-ryan@stl.com', 'Mandaue City', '{"role":"Sales Service Representative","is_active":true}'::jsonb, '2026-09-09T05:19:11.98432+00:00'),
  ('4b542496-5fa5-458d-bb86-6ed3261ceaae', 'admin', 'Admin', 'USER_UPDATED', 'USER', 'qwyn', 'Mandaue City', '{"role":"Sales Service Representative","is_active":true}'::jsonb, '2026-09-09T05:19:19.83579+00:00'),
  ('c3c0b799-f9a4-42cf-99fd-ad6d2ea8e379', 'qwyn', 'Sales Service Representative', 'TICKET_RETURNED', 'returned_winnings', '082826-UAEVIPTU', 'Mandaue City', '{"winAmount":833,"admin_commission":416.5}'::jsonb, '2026-09-09T06:50:13.679056+00:00'),
  ('9069028f-bd15-4bc0-a2b6-161ec84f24b0', 'yuki@stl.com', 'Unclaimed Specialist', 'RECEIPT_VERIFIED', 'RECEIPT', 'MAN-260909-747456', 'Mandaue City', '{"ref":"0111150170P1043","amount":22998,"batchSerial":"MAN-260909-747456"}'::jsonb, '2026-09-09T13:50:35.597768+00:00'),
  ('9d5bc8ee-7204-407b-9bad-a287e43dedf5', 'ssrwild@stl.com', 'Sales Service Representative', 'SETTLEMENT_AGREEMENT_SAVED', 'returned_winnings', '090826-UIUOSHIT', 'ILIGAN SET B', '{"total":2500,"installmentsCount":5}'::jsonb, '2026-09-08T14:02:55.68771+00:00'),
  ('430922bc-8a1b-4de6-a659-1ba0a43b4f1f', 'ssrwild@stl.com', 'Sales Service Representative', 'TICKET_RETURNED', 'returned_winnings', '090826-OOEFSADE', 'ILIGAN SET B', '{"winAmount":1500,"admin_commission":750}'::jsonb, '2026-09-08T08:55:28.152865+00:00'),
  ('85bb4251-eb14-4cf6-9caa-69e610f0e4c5', 'ssrwild@stl.com', 'Sales Service Representative', 'TICKET_RETURNED', 'returned_winnings', '090826-UIUOSHIT', 'ILIGAN SET B', '{"winAmount":2500,"admin_commission":1250}'::jsonb, '2026-09-08T13:59:03.68178+00:00'),
  ('35ca81eb-b9f3-4afa-91e4-ff78cfebc0f4', 'admin', 'Admin', 'GATEWAY_CONFIGS_UPDATED', 'SYSTEM', 'GATEWAY_ENDPOINTS', NULL, '{"count":2}'::jsonb, '2026-09-12T04:17:21.432381+00:00'),
  ('614a8932-1caa-4269-b88e-2f592d76003b', 'ssrwild@stl.com', 'Sales Service Representative', 'TICKET_RETURNED', 'returned_winnings', '090726-IEE23PBO', 'ILIGAN SET B', '{"winAmount":1000,"admin_commission":500}'::jsonb, '2026-09-12T04:23:48.051611+00:00'),
  ('6beb143d-5500-44a9-bd7b-485f5afaa68f', 'admin', 'Admin', 'GATEWAY_CONFIGS_UPDATED', 'SYSTEM', 'GATEWAY_ENDPOINTS', NULL, '{"count":2}'::jsonb, '2026-09-12T05:35:04.22403+00:00'),
  ('c629f395-5089-4298-80e1-f81e8bd06199', 'ssrwild@stl.com', 'Sales Service Representative', 'TICKET_RETURNED', 'returned_winnings', '090726-IEE23PBO', 'ILIGAN SET B', '{"winAmount":1000,"admin_commission":500}'::jsonb, '2026-09-12T06:29:51.817533+00:00'),
  ('41f6333d-2457-458c-981a-e153e2fc39b5', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T07:21:38.032541+00:00'),
  ('f97778f5-581d-493d-b51c-8be415b4ab4c', 'ssrwild@stl.com', 'Sales Service Representative', 'TICKET_RETURNED', 'returned_winnings', '080626-UEICFHGY', 'ILIGAN SET B', '{"winAmount":1650,"admin_commission":825}'::jsonb, '2026-09-12T12:23:38.129741+00:00'),
  ('cddec35b-d182-43a5-8726-5715c035f689', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-14T06:45:34.073953+00:00'),
  ('188a4c82-eb8d-47f2-b7c2-9f111771f9f8', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-08T08:42:07.867272+00:00'),
  ('6ea7f726-bcfd-4df3-b51a-49a06a8770a5', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-08T08:42:15.439943+00:00'),
  ('78d22aec-7484-496a-b0c0-10112b09f661', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:29:19.743689+00:00'),
  ('1bd042f2-5701-41dd-8366-d8dd7541b189', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:29:42.833915+00:00'),
  ('ffa6b969-d265-4190-9794-58b92d985757', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:36:34.180967+00:00'),
  ('d9296d34-974b-432f-842c-6068b80dec40', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:36:44.805668+00:00'),
  ('1f92e660-144e-469f-974a-039ce360d278', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:36:59.97315+00:00'),
  ('4abec416-1645-4a0d-8259-8561c7d05ea6', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:37:15.102978+00:00'),
  ('5aa39545-b456-4adf-95e3-2379c42dee9c', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:37:24.250268+00:00'),
  ('8e595623-c7c4-4d12-8c37-be4534989e8e', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:42:45.381468+00:00'),
  ('8b0ba4f3-cbd1-4f49-878d-7da6f9bc210d', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:43:10.840755+00:00'),
  ('3adf1d70-fa2f-4379-8633-00b4b21a36ac', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:43:11.887528+00:00'),
  ('5677d976-bc1b-4303-aa93-c93570e4c36e', 'admin', 'Admin', 'SUB_OFFICE_UPDATED', 'SUB_OFFICE', 'SET B OFFICE', NULL, '{"name":"SET B OFFICE","status":"ACTIVE","location":"ILIGAN CITY","head_name":"ANGELA TOMAQUIN","updated_at":"2026-09-12T03:44:01.899Z","contact_number":""}'::jsonb, '2026-09-12T03:44:02.064901+00:00'),
  ('bec87f5b-3f36-4f68-90ef-12cc79a551e6', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:54:39.476601+00:00'),
  ('ac1ae62f-28a9-4deb-9a6b-8242fa7a66ba', 'admin', 'Admin', 'SUB_OFFICE_UPDATED', 'SUB_OFFICE', 'SET-B OFFICE', NULL, '{"name":"SET-B OFFICE","status":"ACTIVE","location":"ILIGAN CITY","head_name":"ANGELA TOMAQUIN","updated_at":"2026-09-12T03:44:20.611Z","contact_number":""}'::jsonb, '2026-09-12T03:44:20.658685+00:00'),
  ('b681a6ef-c184-47ae-9315-32b8d853c7e8', 'ssr-ryan@stl.com', 'Sales Service Representative', 'TICKET_RETURNED', 'returned_winnings', '091126-AEE1VEG4', 'Mandaue City', '{"winAmount":833,"admin_commission":416.5}'::jsonb, '2026-09-14T05:17:04.403682+00:00'),
  ('ac692c23-0613-456e-826f-26cb01ea37b4', 'admin', 'Admin', 'SUB_OFFICE_UPDATED', 'SUB_OFFICE', 'SETB OFFICE', NULL, '{"name":"SETB OFFICE","status":"ACTIVE","location":"ILIGAN CITY","head_name":"ANGELA TOMAQUIN","updated_at":"2026-09-12T03:44:45.692Z","contact_number":""}'::jsonb, '2026-09-12T03:44:46.201147+00:00'),
  ('4fd27662-0de8-4adb-a64b-33d45fe79628', 'admin', 'Admin', 'SUB_OFFICE_UPDATED', 'SUB_OFFICE', 'MABDAUE CITY', NULL, '{"name":"MABDAUE CITY","status":"ACTIVE","location":"Barlaps, A.S. Fortuna St., Bakilid, Mandaue City","head_name":"QUENNIE CAPUYAN","updated_at":"2026-09-12T03:45:53.725Z","contact_number":"0917-123-4567"}'::jsonb, '2026-09-12T03:45:54.736381+00:00'),
  ('10e212a5-1e88-4a07-949d-0cc7ac582fe9', 'admin', 'Admin', 'USER_UPDATED', 'USER', 'ssrwild@stl.com', 'ILIGAN SET B', '{"role":"Sales Service Representative","is_active":true}'::jsonb, '2026-09-09T07:45:26.60004+00:00'),
  ('58dec1c4-820a-41ab-8680-c6eff3b26881', 'admin', 'Admin', 'SUB_OFFICE_UPDATED', 'SUB_OFFICE', 'ILIGAN SET B', NULL, '{"name":"ILIGAN SET B","status":"ACTIVE","location":"ILIGAN CITY","head_name":"ANGELA TOMAQUIN","updated_at":"2026-09-12T04:08:59.994Z","contact_number":""}'::jsonb, '2026-09-12T04:09:00.246771+00:00'),
  ('61a84cee-736f-4e87-b1ee-e254192333b0', 'admin', 'Admin', 'GATEWAY_CONFIGS_UPDATED', 'SYSTEM', 'GATEWAY_ENDPOINTS', NULL, '{"count":2}'::jsonb, '2026-09-12T04:09:12.388167+00:00'),
  ('3b2f86d1-6b88-4921-9e7f-dac64685cf8b', 'admin', 'Admin', 'GATEWAY_CONFIGS_UPDATED', 'SYSTEM', 'GATEWAY_ENDPOINTS', NULL, '{"count":2}'::jsonb, '2026-09-12T04:20:01.237245+00:00'),
  ('689ff9db-7888-4883-be6e-1e3f3db1a5a6', 'ssrwild@stl.com', 'Sales Service Representative', 'TICKET_RETURNED', 'returned_winnings', '091226-IUOXOGVI', 'ILIGAN SET B', '{"winAmount":550,"admin_commission":275}'::jsonb, '2026-09-12T04:27:55.377485+00:00'),
  ('162ab7a3-3568-40ef-8b21-b1c93b1199bc', 'admin', 'Admin', 'GATEWAY_CONFIGS_UPDATED', 'SYSTEM', 'GATEWAY_ENDPOINTS', NULL, '{"count":2}'::jsonb, '2026-09-12T05:35:46.03821+00:00'),
  ('d6d6ff74-540f-4ac3-bf9c-f02fbbb66721', 'admin', 'Admin', 'SUB_OFFICE_UPDATED', 'SUB_OFFICE', 'MANDAUE CITY', NULL, '{"name":"MANDAUE CITY","status":"ACTIVE","location":"Barlaps, A.S. Fortuna St., Bakilid, Mandaue City","head_name":"QUENNIE CAPUYAN","updated_at":"2026-09-12T03:46:01.942Z","contact_number":"0917-123-4567"}'::jsonb, '2026-09-12T03:46:02.006455+00:00'),
  ('09d70893-01c1-4fde-b6e6-42999265de65', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:54:55.487153+00:00'),
  ('9f77ea71-9ba3-4f71-b149-8b408edaaee6', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T03:55:46.530294+00:00'),
  ('0adfae48-f424-4519-9353-c3efb21f05a8', 'admin', 'Admin', 'GATEWAY_CONFIGS_UPDATED', 'SYSTEM', 'GATEWAY_ENDPOINTS', NULL, '{"count":2}'::jsonb, '2026-09-12T04:06:16.624727+00:00'),
  ('45dcc786-b0de-4a77-b3ac-319cd316dd43', 'admin', 'Admin', 'GATEWAY_CONFIGS_UPDATED', 'SYSTEM', 'GATEWAY_ENDPOINTS', NULL, '{"count":2}'::jsonb, '2026-09-12T04:06:31.66178+00:00'),
  ('2c1a313f-6b0a-4d5a-9348-ce57fa72657b', 'yuki@stl.com', 'Unclaimed Specialist', 'BATCH_REMITTANCE_PROOF_ATTACHED', 'remittance_receipts', 'cd810244-9d4d-4e11-9fe0-897de07864a2', 'Mandaue City', '{"amount":29080,"channel":"BANK_DEPOSIT","batchSerial":"MAN-260909-747456","ticketsCount":11,"referenceNumber":"ERENCE NO","depositedCharges":0}'::jsonb, '2026-09-09T07:06:15.749522+00:00'),
  ('756880c2-73f7-456d-a2d5-6929c3061158', 'ssr-ryan@stl.com', 'Sales Service Representative', 'CLAIMED_TICKET_DELETION_REQUESTED', 'RETURNED_WINNING', '090526-OAOZLNQM', 'Mandaue City', '{"reason":"Winning ticket has been claimed in the system. Requesting deletion and deduction from collections.","transId":"090526-OAOZLNQM","requester":"ssr-ryan@stl.com","winAmount":833,"hasHardCopyProof":true}'::jsonb, '2026-09-10T09:22:32.093981+00:00'),
  ('ae335f39-375a-4627-af8e-c28620a64710', 'yuki@stl.com', 'Unclaimed Specialist', 'HARDCOPY_CLAIM_DELETION_APPROVED', 'RETURNED_WINNING', '090526-OAOZLNQM', 'Mandaue City', '{"reason":"Winning ticket has been claimed in the system. Requesting deletion and deduction from collections.","transId":"090526-OAOZLNQM","betAmount":10,"winAmount":833,"approvedBy":"yuki@stl.com","requestedBy":"Jay Ryan Lim","deductedFromCollections":true}'::jsonb, '2026-09-11T01:06:16.54675+00:00'),
  ('158ff665-1d0c-424a-9a1e-31b469489a34', 'ssr-ryan@stl.com', 'Sales Service Representative', 'BATCH_REMITTANCE_PROOF_ATTACHED', 'remittance_receipts', '090fa014-b175-42e2-ae33-c88e4c3bdfa7', 'Mandaue City', '{"amount":5249,"channel":"GCASH","batchSerial":"MAN-260911-689599","ticketsCount":5,"referenceNumber":"1044919136722","depositedCharges":10}'::jsonb, '2026-09-11T01:48:21.977249+00:00'),
  ('09d976b2-6019-417f-bea8-066d30398875', 'yuki@stl.com', 'Unclaimed Specialist', 'RECEIPT_VERIFIED', 'RECEIPT', 'MAN-260911-689599', 'Mandaue City', '{"ref":"1044919136722","amount":5249,"batchSerial":"MAN-260911-689599"}'::jsonb, '2026-09-11T01:54:50.045275+00:00'),
  ('54a78207-86de-4d66-872f-7587fb675f9a', 'yuki@stl.com', 'Unclaimed Specialist', 'TICKET_OCR_VERIFIED', 'OCR_CHAT_TICKET', '082126-UAI30868', 'Mandaue City', '{"code":"082126-UAI30868","sender":"Jay Ryan Lim","verifiedBy":"yuki@stl.com"}'::jsonb, '2026-09-11T02:02:38.737998+00:00'),
  ('82beb21c-b277-4b91-99fa-494ef08af14f', 'admin', 'Admin', 'SUB_OFFICE_UPDATED', 'SUB_OFFICE', 'Mandaue City', NULL, '{"name":"Mandaue City","status":"ACTIVE","location":"Barlaps, A.S. Fortuna St., Bakilid, Mandaue City","head_name":"QUENNIE CAPUYAN","updated_at":"2026-09-12T04:08:43.609Z","contact_number":"0917-123-4567"}'::jsonb, '2026-09-12T04:08:44.170722+00:00'),
  ('7190f14b-7fa1-41b3-8ce6-12da5c2aa1a5', 'admin', 'Admin', 'USER_FEATURE_PERMISSIONS_UPDATED', 'SYSTEM', 'USER_FEATURES', NULL, '{"default_qr_modal":true,"userOverridesCount":4,"default_copy_transaction":true}'::jsonb, '2026-09-12T07:21:30.253901+00:00'),
  ('61899475-f5e2-4d66-9e6c-9a9890d08fae', 'ssrwild@stl.com', 'Sales Service Representative', 'TICKET_RETURNED', 'returned_winnings', '080626-UEICFHGY', 'ILIGAN SET B', '{"winAmount":1650,"admin_commission":825}'::jsonb, '2026-09-12T12:04:20.352366+00:00'),
  ('55b1a5a6-ad61-465c-bd2f-4319e3490609', 'ssr-ryan@stl.com', 'Sales Service Representative', 'CLAIMED_TICKET_DELETION_REQUESTED', 'RETURNED_WINNING', '082126-UAI30S5S', 'Mandaue City', '{"reason":"Winning ticket has been claimed in the system. Requesting deletion and deduction from collections.","transId":"082126-UAI30S5S","requester":"ssr-ryan@stl.com","winAmount":5000,"hasHardCopyProof":true}'::jsonb, '2026-09-13T00:43:16.4261+00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anon avatar upload" ON storage.objects;
CREATE POLICY "Anon avatar upload" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anon avatar update" ON storage.objects;
CREATE POLICY "Anon avatar update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'avatars');

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public receipt access" ON storage.objects;
CREATE POLICY "Public receipt access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Anon receipt upload" ON storage.objects;
CREATE POLICY "Anon receipt upload" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Anon receipt update" ON storage.objects;
CREATE POLICY "Anon receipt update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'receipts');

