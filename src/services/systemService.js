import { supabase } from '../config/supabaseClient';

// Shared in-memory cache with 5-minute TTL & in-flight request deduplication
let settingsCache = null;
let settingsCacheTime = 0;
let inFlightSettingsPromise = null;
const SETTINGS_TTL_MS = 5 * 60 * 1000; // 5 minutes

let subOfficesCache = null;
let subOfficesCacheTime = 0;
let inFlightSubOfficesPromise = null;
let subOfficesFullCache = null;
let subOfficesFullCacheTime = 0;
let inFlightSubOfficesFullPromise = null;
const SUB_OFFICES_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const systemService = {
  invalidateCache() {
    settingsCache = null;
    settingsCacheTime = 0;
    inFlightSettingsPromise = null;
    subOfficesCache = null;
    subOfficesCacheTime = 0;
    inFlightSubOfficesPromise = null;
    subOfficesFullCache = null;
    subOfficesFullCacheTime = 0;
    inFlightSubOfficesFullPromise = null;
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

  async fetchFullSubOffices(force = false) {
    const now = Date.now();
    if (!force && subOfficesFullCache && (now - subOfficesFullCacheTime < SUB_OFFICES_TTL_MS)) {
      return subOfficesFullCache;
    }

    if (inFlightSubOfficesFullPromise && !force) {
      return inFlightSubOfficesFullPromise;
    }

    inFlightSubOfficesFullPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('sub_offices')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        subOfficesFullCache = data || [];
        subOfficesFullCacheTime = Date.now();
        return subOfficesFullCache;
      } catch (err) {
        console.warn('Failed to fetch full sub_offices:', err);
        return [];
      } finally {
        inFlightSubOfficesFullPromise = null;
      }
    })();

    return inFlightSubOfficesFullPromise;
  },

  async resolveSubOfficeDetails(officeName = '', force = false) {
    const offices = await this.fetchFullSubOffices(force);
    const primaryOffice = (offices && offices.length > 0) ? offices[0] : null;
    const defaultName = primaryOffice?.name || 'Mandaue City';
    const defaultAddress = primaryOffice?.location || primaryOffice?.address || 'Barlaps, A.S. Fortuna St., Bakilid, Mandaue City';

    const search = (officeName || '').trim();
    const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSearch = cleanStr(search);

    if (!offices || offices.length === 0) {
      return {
        name: defaultName,
        address: defaultAddress
      };
    }

    // 1. Exact match (case-insensitive) against database sub_offices
    let match = offices.find(
      (so) => (so.name || '').toLowerCase().trim() === search.toLowerCase()
    );

    // 2. Contains match against database sub_offices
    if (!match && search && search.toLowerCase() !== 'all' && search.toLowerCase() !== 'central office') {
      match = offices.find(
        (so) =>
          (so.name && so.name.toLowerCase().includes(search.toLowerCase())) ||
          (search && search.toLowerCase().includes((so.name || '').toLowerCase().trim()))
      );
    }

    // 3. Cleaned alphanumeric match against database sub_offices
    if (!match && cleanSearch && cleanSearch !== 'all' && cleanSearch !== 'centraloffice') {
      match = offices.find((so) => {
        const cName = cleanStr(so.name);
        return (cName && cleanSearch) && (cName.includes(cleanSearch) || cleanSearch.includes(cName));
      });
    }

    if (match) {
      return {
        name: match.name || defaultName,
        address: match.location || match.address || defaultAddress,
        ...match
      };
    }

    // Default fallback: First created sub-office in database (e.g. Mandaue City)
    return {
      name: primaryOffice?.name || defaultName,
      address: primaryOffice?.location || primaryOffice?.address || defaultAddress,
      ...(primaryOffice || {})
    };
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
