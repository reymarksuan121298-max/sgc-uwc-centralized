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

  matchSubOfficeRecord(offices, officeName = '') {
    if (!offices || offices.length === 0) return null;
    const search = String(officeName || '').trim();
    if (!search) return null;

    const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSearch = cleanStr(search);

    // 1. Exact match (case-insensitive) against database sub_offices
    let match = offices.find(
      (so) => (so.name || '').toLowerCase().trim() === search.toLowerCase()
    );
    if (match) return match;

    // 2. Contains match against database sub_offices
    if (search.toLowerCase() !== 'all' && search.toLowerCase() !== 'central office') {
      match = offices.find(
        (so) =>
          (so.name && so.name.toLowerCase().includes(search.toLowerCase())) ||
          (search && search.toLowerCase().includes((so.name || '').toLowerCase().trim()))
      );
      if (match) return match;
    }

    // 3. Cleaned alphanumeric match against database sub_offices
    if (cleanSearch && cleanSearch !== 'all' && cleanSearch !== 'centraloffice') {
      match = offices.find((so) => {
        const cName = cleanStr(so.name);
        return cName && (cName.includes(cleanSearch) || cleanSearch.includes(cName));
      });
      if (match) return match;

      // 4. Franchise match
      match = offices.find((so) => {
        const cFran = cleanStr(so.franchise_name);
        return cFran && (cFran.includes(cleanSearch) || cleanSearch.includes(cFran));
      });
      if (match) return match;

      // 5. Special aliases (e.g. Mandaue, Iligan A, Iligan B, Baloi, Lala)
      if (cleanSearch.includes('mandaue')) {
        match = offices.find(so => cleanStr(so.name).includes('mandaue'));
      } else if (cleanSearch.includes('iligan') && (cleanSearch.includes('b') || cleanSearch.endsWith('b'))) {
        match = offices.find(so => cleanStr(so.name).includes('iligan') && cleanStr(so.name).includes('b'));
      } else if (cleanSearch.includes('iligan')) {
        match = offices.find(so => cleanStr(so.name).includes('iligan') && (cleanStr(so.name).includes('a') || !cleanStr(so.name).includes('b'))) || offices.find(so => cleanStr(so.name).includes('iligan'));
      } else if (cleanSearch.includes('baloi')) {
        match = offices.find(so => cleanStr(so.name).includes('baloi'));
      } else if (cleanSearch.includes('lala')) {
        match = offices.find(so => cleanStr(so.name).includes('lala'));
      }
    }

    return match || null;
  },

  resolveSubOfficeSync(officeName = '') {
    const offices = subOfficesFullCache || [];
    const search = String(officeName || '').trim();
    const match = this.matchSubOfficeRecord(offices, search);
    if (match) {
      const isMandaue = (match.name || '').toLowerCase().includes('mandaue') || (match.franchise_name || '').toLowerCase().includes('lucky betplay');
      return {
        name: match.name || search,
        address: match.location || match.address || '',
        location: match.location || match.address || '',
        franchise_name: match.franchise_name || '',
        logo_url: match.logo_url || (isMandaue ? '/lbp.png' : ''),
        ...match
      };
    }
    const isMandaueSearch = search.toLowerCase().includes('mandaue');
    return {
      name: search,
      address: '',
      location: '',
      franchise_name: '',
      logo_url: isMandaueSearch ? '/lbp.png' : ''
    };
  },

  async resolveSubOfficeDetails(officeName = '', force = false) {
    const offices = await this.fetchFullSubOffices(force);
    const search = String(officeName || '').trim();
    const match = this.matchSubOfficeRecord(offices, search);
    if (match) {
      const isMandaue = (match.name || '').toLowerCase().includes('mandaue') || (match.franchise_name || '').toLowerCase().includes('lucky betplay');
      return {
        name: match.name || search,
        address: match.location || match.address || '',
        location: match.location || match.address || '',
        franchise_name: match.franchise_name || '',
        logo_url: match.logo_url || (isMandaue ? '/lbp.png' : ''),
        ...match
      };
    }

    // No fallback to another office's address or logo
    const isMandaueSearch = search.toLowerCase().includes('mandaue');
    return {
      name: search,
      address: '',
      location: '',
      franchise_name: '',
      logo_url: isMandaueSearch ? '/lbp.png' : ''
    };
  },

  getPortalBrandName(officeName = '', subOfficesList = []) {
    const search = (officeName || '').trim().toLowerCase();
    if (!search || search === 'all' || search === 'central office') {
      return 'CENTRALIZED PORTAL';
    }
    const match = (subOfficesList || []).find(
      s => (s.name || '').trim().toLowerCase() === search
    );
    if (match?.franchise_name && match.franchise_name.trim()) {
      return `${match.franchise_name.trim().toUpperCase()} STL PORTAL`;
    }
    return `${officeName.trim().toUpperCase()} STL PORTAL`;
  },

  async updateSetting(key, value, actorUser) {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
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
