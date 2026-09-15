import { supabase } from '../config/supabaseClient';

// Shared in-memory cache with 5-minute TTL & in-flight request deduplication
let settingsCache = null;
let settingsCacheTime = 0;
let inFlightSettingsPromise = null;
const SETTINGS_TTL_MS = 5 * 60 * 1000; // 5 minutes

let subOfficesCache = null;
let subOfficesCacheTime = 0;
let inFlightSubOfficesPromise = null;
const SUB_OFFICES_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const systemService = {
  invalidateCache() {
    settingsCache = null;
    settingsCacheTime = 0;
    inFlightSettingsPromise = null;
    subOfficesCache = null;
    subOfficesCacheTime = 0;
    inFlightSubOfficesPromise = null;
  },

  async fetchSettings(force = false) {
    const now = Date.now();
    if (!force && settingsCache && (now - settingsCacheTime < SETTINGS_TTL_MS)) {
      return settingsCache;
    }

    if (inFlightSettingsPromise && !force) {
      return inFlightSettingsPromise;
    }

    inFlightSettingsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*');

        if (error) throw error;
        settingsCache = data || [];
        settingsCacheTime = Date.now();
        return settingsCache;
      } finally {
        inFlightSettingsPromise = null;
      }
    })();

    return inFlightSettingsPromise;
  },

  async fetchSubOffices(force = false) {
    const now = Date.now();
    if (!force && subOfficesCache && (now - subOfficesCacheTime < SUB_OFFICES_TTL_MS)) {
      return subOfficesCache;
    }

    if (inFlightSubOfficesPromise && !force) {
      return inFlightSubOfficesPromise;
    }

    inFlightSubOfficesPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('sub_offices')
          .select('name')
          .order('name', { ascending: true });

        if (error) throw error;
        subOfficesCache = (data || []).map(s => s.name);
        subOfficesCacheTime = Date.now();
        return subOfficesCache;
      } finally {
        inFlightSubOfficesPromise = null;
      }
    })();

    return inFlightSubOfficesPromise;
  },

  async updateSetting(key, value, actorUser) {
    await supabase
      .from('system_settings')
      .delete()
      .eq('key', key);

    const { data, error } = await supabase
      .from('system_settings')
      .insert([{ key, value, updated_at: new Date().toISOString() }])
      .select();

    if (error) throw error;

    // Invalidate memory cache so all components fetch fresh settings
    this.invalidateCache();

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
