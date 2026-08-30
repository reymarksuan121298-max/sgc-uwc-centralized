import { supabase } from '../config/supabaseClient';

export const receiptsService = {
  async fetchReceipts() {
    const { data, error } = await supabase
      .from('remittance_receipts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async insertReceipt(receiptRecord) {
    const { data, error } = await supabase
      .from('remittance_receipts')
      .insert([receiptRecord])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async verifyReceipt(receiptId, updatePayload, actorUser) {
    const { data, error } = await supabase
      .from('remittance_receipts')
      .update(updatePayload)
      .eq('id', receiptId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert([{
      actor_username: actorUser?.username || 'admin',
      actor_role: actorUser?.role || 'Super Admin',
      action: 'REMITTANCE_VERIFIED',
      target_type: 'REMITTANCE_RECEIPT',
      target_id: String(receiptId),
      sub_office: data.sub_office || 'All',
      details: updatePayload
    }]);

    return data;
  }
};
