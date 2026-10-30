import { supabase } from '../config/supabaseClient';

export const winningsService = {
  async fetchReturnedWinnings() {
    const { data, error } = await supabase
      .from('returned_winnings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async insertReturnedWinning(record) {
    const { data, error } = await supabase
      .from('returned_winnings')
      .insert([record])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteReturnedWinning(record, actorUser) {
    const transId = record.transactionId || record.transId || record.computedTransId;
    let query = supabase.from('returned_winnings').delete();
    if (record.id) {
      query = query.eq('id', record.id);
    } else if (transId) {
      query = query.eq('transactionId', transId);
    }

    const { error } = await query;
    if (error) throw error;

    try {
      await supabase.from('audit_logs').insert([{
        actor_username: actorUser?.username || 'admin',
        actor_role: actorUser?.role || 'Super Admin',
        action: 'RECORD_DELETED',
        target_type: 'RETURNED_WINNING',
        target_id: transId || 'UNKNOWN',
        sub_office: actorUser?.sub_office || 'All',
        details: { deletedRecord: record }
      }]);
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    return true;
  },

  async approveDeletionAndDeductCollections(record, adminUser) {
    const transId = String(record.transaction_id || record.transactionId || record.transId || record.computedTransId || '').trim();
    const returnedWinningsId = record.returned_winnings_id || (record.table !== 'returned_winnings_deletion_requests' ? record.id : null);
    
    // 1. Delete from returned_winnings so it is removed from active/unremitted lists
    let query = supabase.from('returned_winnings').delete();
    if (returnedWinningsId) {
      query = query.eq('id', returnedWinningsId);
    } else if (transId) {
      query = query.eq('transactionId', transId);
    }

    const { error } = await query;
    if (error) {
      console.warn('returned_winnings delete warning:', error);
    }

    // 2. Guarantee that record exists and is marked APPROVED in returned_winnings_deletion_requests
    try {
      const reviewer = adminUser?.full_name || adminUser?.username || 'admin';
      const nowIso = new Date().toISOString();

      // Check if row already exists in returned_winnings_deletion_requests
      let existingRows = [];
      if (record.table === 'returned_winnings_deletion_requests' && record.id) {
        existingRows = [{ id: record.id }];
      } else {
        let findQuery = supabase.from('returned_winnings_deletion_requests').select('id');
        if (transId && returnedWinningsId) {
          findQuery = findQuery.or(`transaction_id.eq.${transId},returned_winnings_id.eq.${returnedWinningsId}`);
        } else if (transId) {
          findQuery = findQuery.eq('transaction_id', transId);
        } else if (returnedWinningsId) {
          findQuery = findQuery.eq('returned_winnings_id', returnedWinningsId);
        } else if (record.id) {
          findQuery = findQuery.eq('id', record.id);
        }
        const { data } = await findQuery;
        if (data && data.length > 0) existingRows = data;
      }

      if (existingRows.length > 0) {
        // Update existing deletion request(s) to APPROVED
        const targetIds = existingRows.map(r => r.id);
        await supabase
          .from('returned_winnings_deletion_requests')
          .update({
            status: 'APPROVED',
            reviewed_by: reviewer,
            reviewed_at: nowIso,
            deducted_from_collections: false,
            updated_at: nowIso
          })
          .in('id', targetIds);
      } else {
        // Insert new record into returned_winnings_deletion_requests as APPROVED
        const payload = {
          returned_winnings_id: null,
          transaction_id: transId,
          sub_office: record.sub_office || adminUser?.sub_office || 'All',
          teller_outlet: record.teller_outlet || record.fullName || record.outlet || record.username || 'N/A',
          supervisor: record.supervisor || null,
          draw_time: record.draw_time || record.drawTime || record.drawDate || 'N/A',
          draw_date: record.draw_date || record.drawDate || record.created_at || null,
          bet_no: record.bet_no || record.betNo || 'N/A',
          bet_code: record.bet_code || record.betCode || 'RS3',
          bet_amount: parseFloat(record.bet_amount ?? record.betAmount ?? 0),
          win_amount: parseFloat(record.win_amount ?? record.winAmount ?? 0),
          status: 'APPROVED',
          reason: record.reason || record.deletion_request_reason || 'Approved deletion and deduction from collections',
          attachment_url: record.attachment_url || record.deletion_request_attachment || record.hard_copy_ticket_url || null,
          requested_by: record.requested_by || record.deletion_request_by || reviewer,
          requested_by_role: record.requested_by_role || adminUser?.role || 'SSR',
          requested_at: record.requested_at || record.deletion_request_at || nowIso,
          reviewed_by: reviewer,
          reviewed_at: nowIso,
          deducted_from_collections: false,
          is_already_deposited: Boolean(record.is_already_deposited || (record.receipt_status && record.receipt_status !== 'NO_RECEIPT')),
          is_claim: Boolean(record.isClaim ?? record.is_claim ?? record.isClaimed ?? record.is_claimed ?? false),
          created_at: record.created_at || nowIso,
          updated_at: nowIso
        };

        await supabase
          .from('returned_winnings_deletion_requests')
          .insert([payload]);
      }
    } catch (e) {
      console.warn('Note: returned_winnings_deletion_requests approve error:', e);
    }

    // 3. Insert audit log
    try {
      await supabase.from('audit_logs').insert([{
        actor_username: adminUser?.username || 'admin',
        actor_role: adminUser?.role || 'Super Admin',
        action: 'HARDCOPY_CLAIM_DELETION_APPROVED',
        target_type: 'RETURNED_WINNING',
        target_id: transId || 'UNKNOWN',
        sub_office: record.sub_office || adminUser?.sub_office || 'All',
        details: {
          teller_outlet: record.teller_outlet || record.fullName || record.outlet || record.username || 'N/A',
          transId,
          draw: record.draw_time || record.drawTime || record.drawDate || 'N/A',
          betNo: record.bet_no || record.betNo || 'N/A',
          betCode: record.bet_code || record.betCode || 'RS3',
          betAmount: parseFloat(record.bet_amount ?? record.betAmount ?? 0),
          winAmount: parseFloat(record.win_amount ?? record.winAmount ?? 0),
          reason: record.reason || record.deletion_request_reason,
          requestedBy: record.requested_by || record.deletion_request_by,
          approvedBy: adminUser?.username,
          deductedFromCollections: true
        }
      }]);
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    return true;
  },

  async rejectDeletionRequest(record, rejectReason, adminUser) {
    const transId = String(record.transaction_id || record.transactionId || record.transId || record.computedTransId || '').trim();
    const returnedWinningsId = record.returned_winnings_id || (record.table !== 'returned_winnings_deletion_requests' ? record.id : null);
    const reviewer = adminUser?.full_name || adminUser?.username || 'admin';
    const nowIso = new Date().toISOString();

    let query = supabase
      .from('returned_winnings')
      .update({
        deletion_request_status: 'REJECTED',
        deletion_rejected_reason: rejectReason || 'Rejected by administrator',
        updated_at: nowIso
      });

    if (returnedWinningsId) {
      query = query.eq('id', returnedWinningsId);
    } else if (transId) {
      query = query.eq('transactionId', transId);
    }

    const { error } = await query;
    if (error) {
      console.warn('returned_winnings update failed on reject:', error);
    }

    // Also update returned_winnings_deletion_requests table
    try {
      let findQuery = supabase.from('returned_winnings_deletion_requests').select('id');
      if (record.table === 'returned_winnings_deletion_requests' && record.id) {
        findQuery = findQuery.eq('id', record.id);
      } else if (transId && returnedWinningsId) {
        findQuery = findQuery.or(`transaction_id.eq.${transId},returned_winnings_id.eq.${returnedWinningsId}`);
      } else if (transId) {
        findQuery = findQuery.eq('transaction_id', transId);
      } else if (returnedWinningsId) {
        findQuery = findQuery.eq('returned_winnings_id', returnedWinningsId);
      } else if (record.id) {
        findQuery = findQuery.eq('id', record.id);
      }

      const { data: existingRows } = await findQuery;
      if (existingRows && existingRows.length > 0) {
        await supabase
          .from('returned_winnings_deletion_requests')
          .update({
            status: 'REJECTED',
            reject_reason: rejectReason || 'Rejected by administrator',
            reviewed_by: reviewer,
            reviewed_at: nowIso,
            updated_at: nowIso
          })
          .in('id', existingRows.map(r => r.id));
      }
    } catch (e) {
      console.warn('Note: returned_winnings_deletion_requests reject error:', e);
    }

    // Insert audit log
    try {
      await supabase.from('audit_logs').insert([{
        actor_username: adminUser?.username || 'admin',
        actor_role: adminUser?.role || 'Super Admin',
        action: 'HARDCOPY_CLAIM_DELETION_REJECTED',
        target_type: 'RETURNED_WINNING',
        target_id: transId || 'UNKNOWN',
        sub_office: record.sub_office || adminUser?.sub_office || 'All',
        details: {
          teller_outlet: record.teller_outlet || record.fullName || record.outlet || record.username || 'N/A',
          transId,
          draw: record.draw_time || record.drawTime || record.drawDate || 'N/A',
          betNo: record.bet_no || record.betNo || 'N/A',
          betCode: record.bet_code || record.betCode || 'RS3',
          betAmount: parseFloat(record.bet_amount ?? record.betAmount ?? 0),
          winAmount: parseFloat(record.win_amount ?? record.winAmount ?? 0),
          rejectReason: rejectReason || 'Rejected by administrator',
          rejectedBy: adminUser?.username
        }
      }]);
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    return true;
  },

  // Fetch all deletion requests from the dedicated table, cross-referencing returned_winnings for missing proofs
  async fetchDeletionRequests(subOffice) {
    try {
      let query = supabase
        .from('returned_winnings_deletion_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (subOffice && subOffice !== 'All') {
        query = query.or(`sub_office.eq.${subOffice},sub_office.eq.All,sub_office.is.null`);
      }

      const { data, error } = await query;
      if (!error && data) {
        // Cross-reference returned_winnings for records missing attachment_url
        const missingTransIds = data
          .filter(r => !r.attachment_url && r.transaction_id)
          .map(r => r.transaction_id);

        if (missingTransIds.length > 0) {
          try {
            const { data: rwMatches } = await supabase
              .from('returned_winnings')
              .select('id, transactionId, deletion_request_attachment, hard_copy_ticket_url, ocr_data, receipt_url')
              .in('transactionId', missingTransIds);

            if (rwMatches && rwMatches.length > 0) {
              const rwMap = new Map();
              rwMatches.forEach(rw => {
                const img = rw.deletion_request_attachment || rw.hard_copy_ticket_url || rw.ocr_data?.hard_copy_image || rw.receipt_url;
                if (img) rwMap.set(rw.transactionId, img);
              });

              return data.map(r => {
                if (!r.attachment_url && rwMap.has(r.transaction_id)) {
                  return { ...r, attachment_url: rwMap.get(r.transaction_id) };
                }
                return r;
              });
            }
          } catch (rwErr) {
            console.warn('Cross-referencing returned_winnings proof notice:', rwErr);
          }
        }

        return data;
      }
    } catch (err) {
      console.warn('returned_winnings_deletion_requests query failed, falling back:', err);
    }
    return [];
  },

  // Create a new deletion request in returned_winnings_deletion_requests & update returned_winnings
  async createDeletionRequest(ticket, reason, attachmentUrl, user, isAlreadyDeposited = true) {
    const transId = String(ticket.transactionId || ticket.transId || ticket.transaction_id || ticket.computedTransId || '').trim();
    const isClaimValue = Boolean(
      ticket.isClaim == 1 || ticket.isClaim === true || ticket.isClaim === '1' ||
      ticket.is_claim == 1 || ticket.is_claim === true || ticket.is_claim === '1' ||
      ticket.isClaimed == 1 || ticket.isClaimed === true || ticket.isClaimed === '1' ||
      ticket.is_claimed == 1 || ticket.is_claimed === true || ticket.is_claimed === '1'
    );

    const payload = {
      returned_winnings_id: ticket.id || null,
      transaction_id: transId,
      sub_office: ticket.sub_office || user?.sub_office || 'All',
      teller_outlet: ticket.fullName || ticket.outlet || ticket.username || 'N/A',
      supervisor: ticket.supervisor || null,
      draw_time: ticket.drawTime || ticket.drawDate || ticket.draw || 'N/A',
      draw_date: ticket.drawDate || ticket.created_at || null,
      bet_no: ticket.betNo || ticket.bet_no || 'N/A',
      bet_code: ticket.betCode || ticket.bet_code || 'RS3',
      bet_amount: parseFloat(ticket.betAmount ?? ticket.bet_amount ?? 0),
      win_amount: parseFloat(ticket.winAmount ?? ticket.win_amount ?? 0),
      status: 'PENDING_APPROVAL',
      reason: reason ? reason.trim() : 'Hard copy ticket claimed (previous deposit deduction)',
      attachment_url: attachmentUrl || ticket.deletion_request_attachment || ticket.hard_copy_ticket_url || ticket.receipt_url || ticket.proof_url || ticket.attachment_url || ticket.ocr_data?.hard_copy_image || null,
      requested_by: user?.full_name || user?.username || 'SSR',
      requested_by_role: user?.role || 'SSR',
      requested_at: new Date().toISOString(),
      is_already_deposited: isAlreadyDeposited !== undefined ? Boolean(isAlreadyDeposited) : true,
      is_claim: isClaimValue,
      deducted_from_collections: false
    };

    // 1. Insert into dedicated table
    let insertedRecord = null;
    try {
      const { data, error } = await supabase
        .from('returned_winnings_deletion_requests')
        .insert([payload])
        .select()
        .single();
      if (!error) {
        insertedRecord = data;
      } else {
        console.warn('Insert into returned_winnings_deletion_requests error:', error.message);
      }
    } catch (insertErr) {
      console.warn('Dedicated deletion requests table insert failed:', insertErr);
    }

    // 2. Also update returned_winnings record status for backwards compatibility
    try {
      let rwQuery = supabase.from('returned_winnings').update({
        deletion_request_status: 'PENDING_ADMIN_APPROVAL',
        deletion_request_reason: payload.reason,
        deletion_request_by: payload.requested_by,
        deletion_request_attachment: attachmentUrl,
        updated_at: new Date().toISOString()
      });
      if (ticket.id) {
        rwQuery = rwQuery.eq('id', ticket.id);
      } else {
        rwQuery = rwQuery.eq('transactionId', transId);
      }
      await rwQuery;
    } catch (rwErr) {
      console.warn('returned_winnings status update error:', rwErr);
    }

    // 3. Write audit log entry for request submission
    try {
      await supabase.from('audit_logs').insert([{
        actor_username: user?.username || 'SSR',
        actor_role: user?.role || 'SSR',
        action: 'CLAIMED_TICKET_DELETION_REQUESTED',
        target_type: 'RETURNED_WINNING',
        target_id: transId || 'UNKNOWN',
        sub_office: payload.sub_office,
        details: {
          teller_outlet: payload.teller_outlet,
          transId,
          draw: payload.draw_time,
          betNo: payload.bet_no,
          betCode: payload.bet_code,
          betAmount: payload.bet_amount,
          winAmount: payload.win_amount,
          dateReturned: payload.draw_date,
          reason: payload.reason,
          requestedBy: payload.requested_by,
          hasHardCopyProof: Boolean(attachmentUrl),
          isAlreadyDeposited: Boolean(isAlreadyDeposited)
        }
      }]);
    } catch (auditErr) {
      console.warn('Audit log write error for deletion request:', auditErr);
    }

    return insertedRecord || payload;
  },

  async updateBatchReceiptStatus(transIds, status = 'PENDING_VERIFICATION') {
    const { error } = await supabase
      .from('returned_winnings')
      .update({
        receipt_status: status,
        updated_at: new Date().toISOString()
      })
      .in('transactionId', transIds);

    if (error) throw error;
    return true;
  }
};

