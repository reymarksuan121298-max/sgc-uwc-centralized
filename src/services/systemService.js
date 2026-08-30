import { supabase } from '../config/supabaseClient';

export const systemService = {
  async fetchSettings() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  async updateSetting(key, value, actorUser) {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
      .select();

    if (error) throw error;

    await supabase.from('audit_logs').insert([{
      actor_username: actorUser?.username || 'admin',
      actor_role: actorUser?.role || 'Super Admin',
      action: 'SETTING_UPDATED',
      target_type: 'SYSTEM_SETTING',
      target_id: key,
      sub_office: 'All',
      details: { key, value }
    }]);

    return data;
  }
};
