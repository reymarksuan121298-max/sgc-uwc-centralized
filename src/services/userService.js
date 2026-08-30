import { supabase } from '../config/supabaseClient';

export const userService = {
  async fetchUsers() {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createUser(userData, actorUser) {
    const { data, error } = await supabase
      .from('app_users')
      .insert([{
        username: userData.username.trim(),
        password: userData.password,
        full_name: userData.fullName.trim() || null,
        role: userData.role,
        sub_office: userData.subOffice,
        is_active: userData.isActive !== undefined ? userData.isActive : true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert([{
      actor_username: actorUser?.username || 'admin',
      actor_role: actorUser?.role || 'Super Admin',
      action: 'USER_CREATED',
      target_type: 'USER',
      target_id: userData.username,
      sub_office: userData.subOffice,
      details: { role: userData.role, is_active: userData.isActive }
    }]);

    return data;
  },

  async updateUser(userId, userData, actorUser) {
    const updatePayload = {
      full_name: userData.fullName.trim() || null,
      role: userData.role,
      sub_office: userData.subOffice,
      is_active: userData.isActive,
      updated_at: new Date().toISOString()
    };
    if (userData.password) {
      updatePayload.password = userData.password;
    }

    const { data, error } = await supabase
      .from('app_users')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert([{
      actor_username: actorUser?.username || 'admin',
      actor_role: actorUser?.role || 'Super Admin',
      action: 'USER_UPDATED',
      target_type: 'USER',
      target_id: userData.username || String(userId),
      sub_office: userData.subOffice,
      details: { role: userData.role }
    }]);

    return data;
  },

  async toggleUserStatus(user, actorUser) {
    const nextStatus = !user.is_active;
    const { error } = await supabase
      .from('app_users')
      .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) throw error;

    await supabase.from('audit_logs').insert([{
      actor_username: actorUser?.username || 'admin',
      actor_role: actorUser?.role || 'Super Admin',
      action: nextStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      target_type: 'USER',
      target_id: user.username,
      sub_office: user.sub_office,
      details: { previous_status: user.is_active, new_status: nextStatus }
    }]);

    return nextStatus;
  }
};
