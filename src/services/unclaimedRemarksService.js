import { supabase } from '../config/supabaseClient';

const STORAGE_KEY = 'stl_unclaimed_ticket_remarks';
const TABLE_NAME = 'unclaimed_ticket_remarks';

let memoryCache = null;

export const unclaimedRemarksService = {
  /**
   * Get cached remarks immediately from memory or localStorage (0ms latency)
   */
  getCachedRemarks() {
    if (memoryCache) return memoryCache;
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        memoryCache = JSON.parse(local);
        return memoryCache;
      }
    } catch (e) {
      console.warn('Failed to read remarks from localStorage:', e);
    }
    return {};
  },

  /**
   * Fetch all remarks from the dedicated `unclaimed_ticket_remarks` Supabase table
   */
  async fetchRemarks() {
    const cached = this.getCachedRemarks();
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn(`[unclaimedRemarksService] Query to ${TABLE_NAME}:`, error.message);
        return cached;
      }

      if (Array.isArray(data)) {
        const remarksMap = {};
        data.forEach((row) => {
          if (row.transaction_id) {
            remarksMap[row.transaction_id] = {
              id: row.id,
              transId: row.transaction_id,
              remark: row.remark,
              author: row.author_name || row.author_username || 'Staff',
              authorUsername: row.author_username,
              authorRole: row.author_role || 'Staff',
              subOffice: row.sub_office,
              ticketDetails: row.ticket_details,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
          }
        });

        memoryCache = remarksMap;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remarksMap));
        } catch { }
        return remarksMap;
      }
    } catch (err) {
      console.warn('[unclaimedRemarksService] fetchRemarks exception:', err);
    }
    return cached;
  },

  /**
   * Save or update a remark in the dedicated `unclaimed_ticket_remarks` table
   */
  async saveRemark({ transId, remarkText, ticket, currentUser }) {
    if (!transId) throw new Error('Transaction ID is required to save a remark.');
    const trimmed = (remarkText || '').trim();
    if (!trimmed) {
      return this.deleteRemark(transId, currentUser);
    }

    const authorUsername = currentUser?.username || 'user';
    const authorName = currentUser?.full_name || currentUser?.username || 'Staff';
    const authorRole = currentUser?.role || 'Staff';
    const subOffice = ticket?.sub_office || currentUser?.sub_office || 'All';
    const nowIso = new Date().toISOString();

    const recordPayload = {
      transaction_id: transId,
      remark: trimmed,
      author_username: authorUsername,
      author_name: authorName,
      author_role: authorRole,
      sub_office: subOffice,
      ticket_details: ticket ? {
        betNo: ticket.betNo || ticket.CombiNo,
        winAmount: ticket.winAmount,
        outlet: ticket.fullName || ticket.outlet || ticket.username,
        drawDate: ticket.drawDate || ticket.drawTime
      } : null,
      updated_at: nowIso
    };

    // Update in-memory and local storage immediately for 0ms reactivity
    const currentRemarks = { ...this.getCachedRemarks() };
    const formattedRecord = {
      transId,
      remark: trimmed,
      author: authorName,
      authorUsername,
      authorRole,
      subOffice,
      ticketDetails: recordPayload.ticket_details,
      createdAt: currentRemarks[transId]?.createdAt || nowIso,
      updatedAt: nowIso
    };
    currentRemarks[transId] = formattedRecord;
    memoryCache = currentRemarks;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentRemarks));
    } catch { }

    // Persist into dedicated `unclaimed_ticket_remarks` table in Supabase
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .upsert(recordPayload, { onConflict: 'transaction_id' })
        .select()
        .single();

      if (error) {
        console.warn(`[unclaimedRemarksService] Error saving to ${TABLE_NAME}:`, error.message);
      } else if (data) {
        formattedRecord.id = data.id;
      }

      // Log activity to audit_logs
      await supabase.from('audit_logs').insert([{
        actor_username: authorUsername,
        actor_role: authorRole,
        action: 'UNCLAIMED_TICKET_REMARK_SAVED',
        target_type: 'UNCLAIMED_TICKET',
        target_id: transId,
        sub_office: subOffice,
        details: {
          remark: trimmed,
          ticketSummary: recordPayload.ticket_details
        }
      }]);
    } catch (syncErr) {
      console.warn('[unclaimedRemarksService] Sync to Supabase error:', syncErr);
    }

    return formattedRecord;
  },

  /**
   * Delete a remark from the dedicated `unclaimed_ticket_remarks` table
   */
  async deleteRemark(transId, currentUser) {
    if (!transId) return;

    // Immediately update local cache
    const currentRemarks = { ...this.getCachedRemarks() };
    delete currentRemarks[transId];
    memoryCache = currentRemarks;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentRemarks));
    } catch { }

    const authorUsername = currentUser?.username || 'user';
    const authorRole = currentUser?.role || 'Staff';

    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('transaction_id', transId);

      if (error) {
        console.warn(`[unclaimedRemarksService] Error deleting from ${TABLE_NAME}:`, error.message);
      }

      await supabase.from('audit_logs').insert([{
        actor_username: authorUsername,
        actor_role: authorRole,
        action: 'UNCLAIMED_TICKET_REMARK_DELETED',
        target_type: 'UNCLAIMED_TICKET',
        target_id: transId,
        sub_office: currentUser?.sub_office || 'All',
        details: { transId }
      }]);
    } catch (syncErr) {
      console.warn('[unclaimedRemarksService] Delete sync error:', syncErr);
    }
  }
};
