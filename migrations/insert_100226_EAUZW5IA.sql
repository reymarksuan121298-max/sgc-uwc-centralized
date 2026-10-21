-- ==============================================================================
-- INSERT QUERY: APPROVED DELETION REQUEST FOR 100226-EAUZW5IA
-- ==============================================================================

INSERT INTO public.returned_winnings_deletion_requests (
    returned_winnings_id,
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
    is_claim,
    created_at,
    updated_at
) VALUES (
    NULL,
    '100226-EAUZW5IA',
    'Mandaue City',
    'JENNIFER COMAHIG',
    'spvr-michael',
    '2PM',
    '2026-10-02',
    '628',
    'RS3',
    10.00,
    833.00,
    'APPROVED',
    'Winning ticket has been claimed in the system. Requesting deletion and deduction from collections.',
    'Jay Ryan Lim',
    'SSR',
    '2026-10-19 07:01:01+00',
    'yuki@stl.com',
    '2026-10-20 01:03:40+00',
    TRUE,
    TRUE,
    TRUE,
    '2026-10-19 07:01:01+00',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    status = 'APPROVED',
    deducted_from_collections = TRUE,
    reviewed_by = 'yuki@stl.com',
    reviewed_at = NOW(),
    updated_at = NOW();

-- Ensure it is removed from active returned_winnings if still present
DELETE FROM public.returned_winnings WHERE "transactionId" = '100226-EAUZW5IA';
