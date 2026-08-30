import { supabase } from '../config/supabaseClient';

export const auditService = {
  async fetchLogs(limit = 200) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async logAction({ actorUsername, actorRole, action, targetType, targetId, subOffice, details }) {
    try {
      await supabase.from('audit_logs').insert([{
        actor_username: actorUsername || 'System',
        actor_role: actorRole || 'Unclaimed Specialist',
        action,
        target_type: targetType,
        target_id: targetId,
        sub_office: subOffice || 'All',
        details: details || {}
      }]);
    } catch (e) {
      console.warn('Could not record audit log:', e);
    }
  }
};
