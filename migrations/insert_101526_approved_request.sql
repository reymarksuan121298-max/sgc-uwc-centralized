-- ==============================================================================
-- MIGRATION SCRIPT: INSERT APPROVED DELETION REQUEST FOR 101526-AOOMYUOW
-- Ensures 101526-AOOMYUOW appears in the APPROVED REQUEST tab
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
    '101526-AOOMYUOW',
    'Mandaue City',
    'ANNABEL T. BORRINAGA - Mandaue_0832',
    'spvr-molly',
    '9PM',
    '2026-10-15',
    '191',
    'TS3',
    10.00,
    5000.00,
    'APPROVED',
    'Approved claimed/returned winning ticket deletion request.',
    'mark',
    'SSR',
    NOW(),
    'yuki@stl.com',
    NOW(),
    TRUE,
    TRUE,
    FALSE,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    status = 'APPROVED',
    deducted_from_collections = TRUE,
    reviewed_by = 'yuki@stl.com',
    reviewed_at = NOW(),
    updated_at = NOW();

-- Remove from active returned_winnings since it is approved
DELETE FROM public.returned_winnings WHERE "transactionId" = '101526-AOOMYUOW';
