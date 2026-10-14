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
    const transId = record.transactionId || record.transId || record.computedTransId;
    let query = supabase.from('returned_winnings').delete();
    if (record.id) {
      query = query.eq('id', record.id);
    } else if (transId) {
      query = query.eq('transactionId', transId);
    }

    const { error } = await query;
    if (error) throw error;

    // Also update returned_winnings_deletion_requests table if row exists
    try {
      await supabase
        .from('returned_winnings_deletion_requests')
        .update({
          status: 'APPROVED',
          reviewed_by: adminUser?.username || 'admin',
          reviewed_at: new Date().toISOString(),
          deducted_from_collections: true,
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', transId);
    } catch (e) {
      console.warn('Note: returned_winnings_deletion_requests update error or table not yet migrated:', e);
    }

    return true;
  },

  async rejectDeletionRequest(record, rejectReason, adminUser) {
    const transId = record.transactionId || record.transId || record.computedTransId;
    let query = supabase
      .from('returned_winnings')
      .update({
        deletion_request_status: 'REJECTED',
        deletion_rejected_reason: rejectReason || 'Rejected by administrator',
        updated_at: new Date().toISOString()
      });

    if (record.id) {
      query = query.eq('id', record.id);
    } else if (transId) {
      query = query.eq('transactionId', transId);
    }

    const { error } = await query;
    if (error) {
      console.warn('returned_winnings update failed on reject:', error);
    }

    // Also update returned_winnings_deletion_requests table
    try {
      await supabase
        .from('returned_winnings_deletion_requests')
        .update({
          status: 'REJECTED',
          reject_reason: rejectReason || 'Rejected by administrator',
          reviewed_by: adminUser?.username || 'admin',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', transId);
    } catch (e) {
      console.warn('Note: returned_winnings_deletion_requests update error:', e);
    }

    return true;
  },

  // Fetch all deletion requests from the dedicated table, with fallback to audit logs
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
        return data;
      }
    } catch (err) {
      console.warn('returned_winnings_deletion_requests query failed, falling back:', err);
    }
    return [];
  },

  // Create a new deletion request in returned_winnings_deletion_requests & update returned_winnings
  async createDeletionRequest(ticket, reason, attachmentUrl, user, isAlreadyDeposited = false) {
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
      attachment_url: attachmentUrl || null,
      requested_by: user?.full_name || user?.username || 'SSR',
      requested_by_role: user?.role || 'SSR',
      requested_at: new Date().toISOString(),
      is_already_deposited: Boolean(isAlreadyDeposited),
      isClaim: isClaimValue,
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

