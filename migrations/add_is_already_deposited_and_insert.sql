-- ==============================================================================
-- MIGRATION & INSERT SCRIPT: RETURNED WINNINGS DELETION REQUESTS
-- 1. Adds `is_already_deposited` and `isClaim` BOOLEAN columns
-- 2. Inserts approved claimed winning ticket 100226-0OUGQYRI with all 3 conditions = TRUE
-- ==============================================================================

-- STEP 1: Add columns if they do not already exist
ALTER TABLE public.returned_winnings_deletion_requests 
ADD COLUMN IF NOT EXISTS is_already_deposited BOOLEAN DEFAULT FALSE;

ALTER TABLE public.returned_winnings_deletion_requests 
ADD COLUMN IF NOT EXISTS "isClaim" BOOLEAN DEFAULT FALSE;

-- Indexes for high-performance filtering
CREATE INDEX IF NOT EXISTS idx_del_req_is_deposited 
ON public.returned_winnings_deletion_requests(is_already_deposited);

CREATE INDEX IF NOT EXISTS idx_del_req_is_claim 
ON public.returned_winnings_deletion_requests("isClaim");

-- STEP 2: Insert the deletion record for transaction 100226-0OUGQYRI
INSERT INTO public.returned_winnings_deletion_requests (
    transaction_id,
    sub_office,
    teller_outlet,
    supervisor,
    draw_time,
    draw_date,
    bet_no,
    bet_code,
    bet_amount,
    win_amount,
    status,
    reason,
    requested_by,
    requested_by_role,
    requested_at,
    reviewed_by,
    reviewed_at,
    deducted_from_collections,
    is_already_deposited,
    "isClaim",
    created_at,
    updated_at
) VALUES (
    '100226-0OUGQYRI',
    'Mandaue City',
    'MARY ANN, CATIPAY',
    'spvr-molly',
    '9PM',
    '2026-10-10',
    '198',
    'RS2',
    10.00,
    833.00,
    'APPROVED', -- Condition 1: status = APPROVED (TRUE)
    'Winning ticket has been claimed in the system. Requesting deletion and deduction from collections.',
    'Jay Ryan Lim',
    'SSR',
    '2026-10-10 13:37:00+08',
    'yuki@stl.com',
    '2026-10-10 13:37:00+08',
    TRUE,
    TRUE,       -- Condition 2: is_already_deposited = TRUE
    TRUE,       -- Condition 3: isClaim = TRUE
    '2026-10-10 13:37:00+08',
    NOW()
)
ON CONFLICT (id) DO NOTHING;
