import { supabase } from '../config/supabaseClient';
import { hashPassword } from '../utils/cryptoUtils';

// In-memory cache for all users and active users with 3-minute TTL & in-flight deduplication
let allUsersCache = null;
let allUsersCacheTime = 0;
let inFlightAllUsersPromise = null;

let activeUsersCache = null;
let activeUsersCacheTime = 0;
let inFlightActiveUsersPromise = null;

const USERS_TTL_MS = 3 * 60 * 1000; // 3 minutes

export const userService = {
  invalidateCache() {
    allUsersCache = null;
    allUsersCacheTime = 0;
    inFlightAllUsersPromise = null;
    activeUsersCache = null;
    activeUsersCacheTime = 0;
    inFlightActiveUsersPromise = null;
  },

  async fetchUsers(force = false) {
    const now = Date.now();
    if (!force && allUsersCache && (now - allUsersCacheTime < USERS_TTL_MS)) {
      return allUsersCache;
    }

    if (inFlightAllUsersPromise && !force) {
      return inFlightAllUsersPromise;
    }

    inFlightAllUsersPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        allUsersCache = data || [];
        allUsersCacheTime = Date.now();
        return allUsersCache;
      } finally {
        inFlightAllUsersPromise = null;
      }
    })();

    return inFlightAllUsersPromise;
  },

  async fetchActiveUsers(force = false) {
    const now = Date.now();
    if (!force && activeUsersCache && (now - activeUsersCacheTime < USERS_TTL_MS)) {
      return activeUsersCache;
    }

    if (inFlightActiveUsersPromise && !force) {
      return inFlightActiveUsersPromise;
    }

    inFlightActiveUsersPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id, username, full_name, role, sub_office, is_active, last_login_at')
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        if (error) throw error;
        activeUsersCache = data || [];
        activeUsersCacheTime = Date.now();
        return activeUsersCache;
      } finally {
        inFlightActiveUsersPromise = null;
      }
    })();

    return inFlightActiveUsersPromise;
  },

  async createUser(userData, actorUser) {
    const finalSubOffice = (userData.subOffice === 'All' || !userData.subOffice) ? null : userData.subOffice;
    const hashedPassword = await hashPassword(userData.password);
    const { data, error } = await supabase
      .from('app_users')
      .insert([{
        username: userData.username.trim(),
        password: hashedPassword,
        full_name: userData.fullName.trim() || null,
        role: userData.role,
        sub_office: finalSubOffice,
        is_active: userData.isActive !== undefined ? userData.isActive : true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    this.invalidateCache();

    await supabase.from('audit_logs').insert([{
      actor_username: actorUser?.username || 'admin',
      actor_role: actorUser?.role || 'Super Admin',
      action: 'USER_CREATED',
      target_type: 'USER',
      target_id: userData.username,
      sub_office: finalSubOffice || 'All Branches',
      details: { role: userData.role, is_active: userData.isActive }
    }]);

    return data;
  },

  async updateUser(userId, userData, actorUser) {
    const finalSubOffice = (userData.subOffice === 'All' || !userData.subOffice) ? null : userData.subOffice;
    const updatePayload = {
      full_name: userData.fullName.trim() || null,
      role: userData.role,
      sub_office: finalSubOffice,
      is_active: userData.isActive,
      updated_at: new Date().toISOString()
    };
    if (userData.password) {
      updatePayload.password = await hashPassword(userData.password);
    }

    const { data, error } = await supabase
      .from('app_users')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    this.invalidateCache();

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

    this.invalidateCache();

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
