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

    try {
      await supabase.from('audit_logs').insert([{
        actor_username: adminUser?.username || 'admin',
        actor_role: adminUser?.role || 'Super Admin',
        action: 'HARDCOPY_CLAIM_DELETION_APPROVED',
        target_type: 'RETURNED_WINNING',
        target_id: transId || 'UNKNOWN',
        sub_office: record.sub_office || adminUser?.sub_office || 'All',
        details: {
          transId,
          winAmount: record.winAmount,
          betAmount: record.betAmount,
          reason: record.deletion_request_reason,
          requestedBy: record.deletion_request_by,
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
    if (error) throw error;

    try {
      await supabase.from('audit_logs').insert([{
        actor_username: adminUser?.username || 'admin',
        actor_role: adminUser?.role || 'Super Admin',
        action: 'HARDCOPY_CLAIM_DELETION_REJECTED',
        target_type: 'RETURNED_WINNING',
        target_id: transId || 'UNKNOWN',
        sub_office: record.sub_office || adminUser?.sub_office || 'All',
        details: {
          transId,
          rejectReason,
          rejectedBy: adminUser?.username
        }
      }]);
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    return true;
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
