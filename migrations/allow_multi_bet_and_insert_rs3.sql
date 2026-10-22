-- ==============================================================================
-- MIGRATION: ALLOW MULTIPLE BETS PER TRANSACTION & INSERT MISSING RS3 BET
-- Table: public.returned_winnings
-- Performed By: SSR Ryan (ssr-ryan@stl.com / Jay Ryan Lim)
-- Transaction ID: 101526-AOOMYUOW
-- ==============================================================================

-- STEP 1: Drop the restrictive single-column unique constraint on transactionId
-- This constraint previously prevented storing multiple combinations (e.g. TS3 straight + RS3 rambolito) for the same physical ticket.
ALTER TABLE public.returned_winnings 
DROP CONSTRAINT IF EXISTS "returned_winnings_transactionId_key";

-- STEP 2: Create a composite unique constraint on (transactionId, betCode)
-- Allows a ticket to have distinct bet codes (TS3, RS3, etc.) while preventing exact duplicate inserts of the same bet.
ALTER TABLE public.returned_winnings 
DROP CONSTRAINT IF EXISTS "returned_winnings_trans_bet_unique";

ALTER TABLE public.returned_winnings 
ADD CONSTRAINT "returned_winnings_trans_bet_unique" UNIQUE ("transactionId", "betCode");

CREATE UNIQUE INDEX IF NOT EXISTS idx_returned_winnings_trans_bet 
ON public.returned_winnings ("transactionId", "betCode");

-- STEP 3: Insert the missing RS3 Rambolito bet for transaction 101526-AOOMYUOW
-- Bet 1 (TS3, Win: ₱5,000.00, Bet: ₱10.00) already exists in returned_winnings.
-- Bet 2 (RS3, Win: ₱1,667.00, Bet: ₱10.00) is inserted below with receipt_status = 'NO_RECEIPT' (Unremitted).
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
    '6526114',
    '101526-AOOMYUOW',
    'spvr-molly',
    'ANNABEL T. BORRINAGA - Mandaue_0832',
    'RIVERSIDE',
    'OPAO',
    'Mandaue_0832',
    '31',
    'Mandaue City',
    '21',
    '2026-10-15 00:00:00',
    '191',
    'RS3',
    1,
    10.00,
    1667.00,
    1667.00,
    833.50,
    500.10,
    166.70,
    166.70,
    'NO_RECEIPT',
    1,
    '2026-10-20 13:04:25+08'
)
ON CONFLICT ("transactionId", "betCode") DO UPDATE 
SET 
    "winAmount" = EXCLUDED."winAmount",
    "betAmount" = EXCLUDED."betAmount",
    "receipt_status" = 'NO_RECEIPT',
    "created_at" = '2026-10-20 13:04:25+08';

-- Also explicitly update existing record to ensure Date Returned displays Oct 20, 2026, 1:04 PM
UPDATE public.returned_winnings
SET "created_at" = '2026-10-20 13:04:25+08'
WHERE ("transactionId" = '101526-AOOMYUOW') AND "betCode" = 'RS3';

-- STEP 4: Record that SSR Ryan performed the return of this transaction
UPDATE public.audit_logs 
SET actor_username = 'ssr-ryan@stl.com',
    actor_role = 'Sales Service Representative',
    created_at = '2026-10-20 13:04:25+08'
WHERE target_id = '101526-AOOMYUOW';

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
    'ssr-ryan@stl.com',
    'Sales Service Representative',
    'TICKET_RETURNED',
    'returned_winnings',
    '101526-AOOMYUOW',
    'Mandaue City',
    '{"winAmount": 1667, "admin_commission": 833.50, "betCode": "RS3", "performed_by": "ssr-ryan@stl.com"}'::jsonb,
    '2026-10-20 13:04:25+08'
WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs 
    WHERE target_id = '101526-AOOMYUOW' AND (details->>'betCode') = 'RS3'
);
