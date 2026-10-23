-- ==============================================================================
-- MIGRATION: ALLOW MULTIPLE BETS PER TRANSACTION & INSERT MISSING RS3 BETS
-- Table: public.returned_winnings
-- Performed For: Transaction 101726-OOOBRQE0 & 101526-AOOMYUOW
-- Sub-Office: Mandaue City
-- ==============================================================================

-- STEP 1: Drop the legacy restrictive single-column unique constraint on transactionId
-- This constraint previously prevented storing multiple combinations (e.g. TS3 straight + RS3 rambolito) for the same physical ticket.
ALTER TABLE public.returned_winnings 
DROP CONSTRAINT IF EXISTS "returned_winnings_transactionId_key";

-- STEP 2: Create composite unique constraint on (transactionId, betCode)
-- Allows a ticket to have distinct bet codes (TS3, RS3, etc.) while preventing duplicate inserts of the exact same bet.
ALTER TABLE public.returned_winnings 
DROP CONSTRAINT IF EXISTS "returned_winnings_trans_bet_unique";

ALTER TABLE public.returned_winnings 
ADD CONSTRAINT "returned_winnings_trans_bet_unique" UNIQUE ("transactionId", "betCode");

CREATE UNIQUE INDEX IF NOT EXISTS idx_returned_winnings_trans_bet 
ON public.returned_winnings ("transactionId", "betCode");

-- STEP 3: Insert the missing RS3 Rambolito bet for transaction 101726-OOOBRQE0
-- Bet 1 (TS3, Win: ₱2,500.00, Bet: ₱5.00, apiId: 6706719) is already in returned_winnings.
-- Bet 2 (RS3, Win: ₱833.00, Bet: ₱5.00, apiId: 6706720) is inserted below with receipt_status = 'NO_RECEIPT' (Unremitted).
INSERT INTO public.returned_winnings (
    "apiId",
    "transactionId",
    "username",
    "fullName",
    "address",
    "location",
    "outlet",
    "supervisor",
    "sub_office",
    "drawTime",
    "drawDate",
    "betNo",
    "betCode",
    "rambolito",
    "betAmount",
    "winAmount",
    "return_amount_out",
    "admin_commission",
    "agent_commission",
    "staff_commission",
    "collector_commission",
    "receipt_status",
    "status",
    "created_at"
) VALUES (
    '6706720',
    '101726-OOOBRQE0',
    'spvr-michael',
    'SOON, CHERYL',
    'PAKNAAN, MANDAUE CITY',
    'MANDAUE CITY',
    'SOON, CHERYL',
    '24',
    'Mandaue City',
    '17',
    '2026-10-17 00:00:00',
    '944',
    'RS3',
    1,
    5.00,
    833.00,
    833.00,
    416.50,
    249.90,
    83.30,
    83.30,
    'NO_RECEIPT',
    1,
    '2026-10-20 14:53:53+08'
)
ON CONFLICT ("transactionId", "betCode") DO UPDATE 
SET 
    "winAmount" = EXCLUDED."winAmount",
    "betAmount" = EXCLUDED."betAmount",
    "receipt_status" = 'NO_RECEIPT',
    "created_at" = '2026-10-20 14:53:53+08';

-- STEP 4: Ensure audit log has complete record of the return
INSERT INTO public.audit_logs (
    actor_username,
    actor_role,
    action,
    target_type,
    target_id,
    sub_office,
    details,
    created_at
)
SELECT 
    'mark',
    'Sales Service Representative',
    'TICKET_RETURNED',
    'returned_winnings',
    '101726-OOOBRQE0',
    'Mandaue City',
    '{"winAmount": 833, "admin_commission": 416.50, "betCode": "RS3", "performed_by": "mark"}'::jsonb,
    '2026-10-20 14:53:53+08'
WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs 
    WHERE target_id = '101726-OOOBRQE0' AND (details->>'betCode') = 'RS3'
);
