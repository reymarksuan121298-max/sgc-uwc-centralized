/**
 * Supervisor Service
 * Fetches, filters, and resolves supervisor mappings per sub-office (e.g. ILIGAN SET A/B from stl-ldn-api.com).
 */

// ─── ILIGAN SET B ────────────────────────────────────────────────────────────
export const ILIGAN_ALLOWED_SUPERVISORS = [
  "jasonmabini@gfldn",
  "jessentpizon@gfldn",
  "jacksonslimpangog@gfldn",
  "rielmpizon@gfldn",
  "ianjohnmbalala@gfldn",
  "ivankennethg.agcopra@gfldn",
  "coor@gfldn"
];

// ─── ILIGAN SET A ────────────────────────────────────────────────────────────
// Whitelist of authorized ILIGAN SET A supervisors (from ?id=5 and ?id=8)
export const ILIGAN_SET_A_ALLOWED_SUPERVISORS = [
  // From supervisor?id=8
  "edmondgonzaga@gfldn",
  "steverodriguez@gfldn",
  // From supervisor?id=5
  "camilojayminoza@gfldn",
  "cristianagaton@gfldn",
  "clintdarylbalansag@gfldn",
  "edgardocainglesjr@gfldn",
  "jasonamen@gfldn",
  "erluarboladura@gfldn",
  "frexyniesbacalso@gfldn",
  "hectorcandole@gfldn",
  "isaganipaculba@gfldn",
  "jesustitodonato@gfldn",
  "jetmichaeldonato@gfldn",
  "joelordona@gfldn",
  "junriemorales@gfldn",
  "patrickchiong@gfldn",
  "johnstephgorres@gfldn",
  "arnoldabitona@gfldn",
  "navexyrilhotilla@gfldn",
  "regiemorales@gfldn",
  "marlontautoan@gfldn",
  "annesumile@gfldn",
  "mubaraktomanor@gfldn",
  "amirodingmaba@gfldn"
];

// ─── LALA OFFICE (id=2) ──────────────────────────────────────────────────────
export const LALA_OFFICE_ALLOWED_SUPERVISORS = [
  "archiefernandez@gfldn",
  "melvinlimbaga@gfldn",
  "noelordonez@gfldn",
  "jasongaudiano@gfldn",
  "jetpepito@gfldn",
  "roelluab@gfldn",
  "alindaalingan@gfldn",
  "odencampong@gfldn",
  "alancaralos@gfldn",
  "jovanfernandez@gfldn",
  "marjohndelacerna@gfldn",
  "rutherdelacerna@gfldn",
  "andyvicabias@gfldn",
  "jeffreybaguio@gfldn",
  "daveasidor@gfldn",
  "nadermasauna@gfldn",
  "faisalmacabato@gfldn",
  "froilanbuhisan@gfldn",
  "jamesmarlonlucot@gfldn",
  "jovenillodayle@gfldn",
  "dextheralandroque@gfldn",
  "labador@gfldn",
  "honeyclearlumantas@gfldn",
  "kissiemontero@gfldn"
];
// ─── BALOI OFFICE (id=6) ─────────────────────────────────────────────────────
export const BALOI_OFFICE_ALLOWED_SUPERVISORS = [
  "jaysalac@gfldn",
  "mapantasmala@gfldn",
  "alisamagondacan@gfldn",
  "acmadpalo@gfldn"
];

// ─── Default name map (static fallback) ─────────────────────────────────────
export const DEFAULT_SUPERVISOR_NAMES = {
  // Standard Sub-Office Supervisors
  "spvr-arlfred": "ARLFRED SABERON",
  "spvr-raffy": "RAFFY BAGUIO",
  "spvr-roel": "ROEL CATALAN",
  "spvr-michael": "MICHAEL DE GUZMAN",
  "spvr-joel": "JOEL ESTORCO",
  "spvr-eya": "HARRY EYA",
  "spvr-carl": "CARL MANGRUBAN",
  "spvr-jed": "JED MELENDREZ",
  "spvr-nyor": "NYOR SESALDO",
  "spvr-jason": "NARCISO TAGUD JR.",
  "spvr-molly": "MOLLY BATUBALANOS",
  "spvr-apple": "COORDINATOR - APPLEGROUP",
  "21": "RAFFY BAGUIO",
  "22": "ARLFRED SABERON",
  "23": "ROEL CATALAN",
  "24": "MICHAEL DE GUZMAN",
  "25": "JOEL ESTORCO",
  "26": "HARRY EYA",
  "27": "CARL MANGRUBAN",
};
/**
 * Checks if a supervisor username/key belongs to the allowed ILIGAN SET B supervisors
 * @param {string} key
 * @returns {boolean}
 */
export function isIliganAllowedSupervisor(key) {
  if (!key) return false;
  const clean = String(key).trim().toLowerCase();
  return ILIGAN_ALLOWED_SUPERVISORS.some(allowed => {
    const a = allowed.toLowerCase();
    const prefix = a.split('@')[0];
    return clean === a || clean === prefix || clean.startsWith(prefix) || a.includes(clean);
  });
}

/**
 * Checks if a supervisor belongs to ILIGAN SET A.
 * If ILIGAN_SET_A_ALLOWED_SUPERVISORS is empty, all supervisors from the API are accepted.
 * @param {string} key
 * @returns {boolean}
 */
export function isIliganSetAAllowedSupervisor(key) {
  if (!key) return false;
  if (ILIGAN_SET_A_ALLOWED_SUPERVISORS.length === 0) return true;
  const clean = String(key).trim().toLowerCase();
  return ILIGAN_SET_A_ALLOWED_SUPERVISORS.some(allowed => {
    const a = allowed.toLowerCase();
    const prefix = a.split('@')[0];
    return clean === a || clean === prefix || clean.startsWith(prefix) || a.includes(clean);
  });
}

/**
 * Checks if a supervisor belongs to LALA OFFICE.
 * @param {string} key
 * @returns {boolean}
 */
export function isLalaOfficeAllowedSupervisor(key) {
  if (!key) return false;
  if (LALA_OFFICE_ALLOWED_SUPERVISORS.length === 0) return true;
  const clean = String(key).trim().toLowerCase();
  return LALA_OFFICE_ALLOWED_SUPERVISORS.some(allowed => {
    const a = allowed.toLowerCase();
    const prefix = a.split('@')[0];
    return clean === a || clean === prefix || clean.startsWith(prefix) || a.includes(clean);
  });
}

/**
 * Checks if a supervisor belongs to BALOI OFFICE.
 * @param {string} key
 * @returns {boolean}
 */
export function isBaloiOfficeAllowedSupervisor(key) {
  if (!key) return false;
  if (BALOI_OFFICE_ALLOWED_SUPERVISORS.length === 0) return true;
  const clean = String(key).trim().toLowerCase();
  return BALOI_OFFICE_ALLOWED_SUPERVISORS.some(allowed => {
    const a = allowed.toLowerCase();
    const prefix = a.split('@')[0];
    return clean === a || clean === prefix || clean.startsWith(prefix) || a.includes(clean);
  });
}

// In-memory cache keyed by sub-office label
const supervisorCache = new Map();

/**
 * Resolve the Bearer auth header from gateway endpoints.
 * Prefers an Iligan/LDN-labeled endpoint; falls back to any active endpoint
 * since all endpoints share the same token.
 */
function getIliganAuthHeader(gatewayEndpoints = []) {
  const eps = (gatewayEndpoints || []).filter(e => e && e.is_active !== false);

  // Prefer an endpoint explicitly labeled for Iligan/LDN
  let ep = eps.find(e => {
    const sub = (e.sub_office || e.name || '').toLowerCase();
    const url = (e.baseUrl || '').toLowerCase();
    return sub.includes('iligan') || url.includes('stl-ldn-api') || sub.includes('ldn');
  });

  // Fall back to any active endpoint (all share the same token)
  if (!ep && eps.length > 0) ep = eps.find(e => e.token) || eps[0];

  const rawToken = (ep?.token || '').trim();
  return rawToken
    ? (rawToken.toLowerCase().startsWith('bearer ') ? rawToken : `Bearer ${rawToken}`)
    : '';
}

// 10-Minute in-memory cache for supervisor endpoints
const supervisorUrlCache = new Map();
const SUPERVISOR_CACHE_TTL = 10 * 60 * 1000;

/**
 * Helper to fetch and parse supervisor data from a list of candidate URLs
 * @param {Array<string>} urls
 * @param {string} authHeader
 * @param {Function|null} allowFn - (username: string) => boolean, or null to accept all
 * @returns {Promise<Object>}
 */
async function fetchSupervisorsFromUrls(urls, authHeader, allowFn = null) {
  if (!authHeader) {
    console.warn('[SupervisorService] Skipping supervisor fetch: Missing or invalid auth token for Iligan endpoint.');
    return {};
  }

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Authorization': authHeader
  };

  const merged = {};
  const now = Date.now();

  await Promise.all(
    urls.map(async (url) => {
      try {
        const cached = supervisorUrlCache.get(url);
        if (cached && (now - cached.timestamp) < SUPERVISOR_CACHE_TTL) {
          const rawList = cached.data;
          rawList.forEach(item => {
            if (!item) return;
            const name = (
              item.name || item.fullName || item.full_name ||
              item.supervisor_name || item.username || ''
            ).trim().toUpperCase();
            const username = (item.username || item.email || '').trim().toLowerCase();
            if (allowFn && username && !allowFn(username)) return;
            if (name) {
              if (item.id !== undefined && item.id !== null) merged[String(item.id).toLowerCase()] = name;
              if (username) {
                merged[username] = name;
                merged[username.split('@')[0]] = name;
              }
              if (item.code) merged[String(item.code).toLowerCase()] = name;
            }
          });
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) {
          console.warn(`[SupervisorService] ${url} returned HTTP ${res.status}`);
          return;
        }
        const json = await res.json();
        const rawList = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.supervisors)
              ? json.supervisors
              : json?.data && typeof json.data === 'object'
                ? [json.data]
                : [];

        supervisorUrlCache.set(url, { timestamp: now, data: rawList });

        rawList.forEach(item => {
          if (!item) return;
          const name = (
            item.name || item.fullName || item.full_name ||
            item.supervisor_name || item.username || ''
          ).trim().toUpperCase();

          const username = (item.username || item.email || '').trim().toLowerCase();

          if (allowFn && username && !allowFn(username)) return;

          if (name) {
            if (item.id !== undefined && item.id !== null) {
              merged[String(item.id).toLowerCase()] = name;
            }
            if (username) {
              merged[username] = name;
              merged[username.split('@')[0]] = name;
            }
            if (item.code) {
              merged[String(item.code).toLowerCase()] = name;
            }
          }
        });
      } catch (err) {
        console.warn(`[SupervisorService] Failed to fetch from ${url}:`, err);
      }
    })
  );

  return merged;
}

// ─── ILIGAN SET B (id=7) ─────────────────────────────────────────────────────

/**
 * Fetch supervisors for ILIGAN SET B (supervisor?id=7)
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchIliganSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'ILIGAN_SET_B';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const authHeader = getIliganAuthHeader(gatewayEndpoints);
  const result = await fetchSupervisorsFromUrls(
    ['https://stl-ldn-api.com/api/accountant/supervisor?id=7'],
    authHeader,
    isIliganAllowedSupervisor
  );

  if (Object.keys(result).length > 0) supervisorCache.set(cacheKey, result);
  return result;
}

// ─── ILIGAN SET A (id=5 + id=8) ──────────────────────────────────────────────

/**
 * Fetch supervisors for ILIGAN SET A (supervisor?id=5 and supervisor?id=8).
 * Results from both endpoints are merged into a single map.
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchIliganSetASupervisors(gatewayEndpoints = []) {
  const cacheKey = 'ILIGAN_SET_A';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const authHeader = getIliganAuthHeader(gatewayEndpoints);
  const result = await fetchSupervisorsFromUrls(
    [
      'https://stl-ldn-api.com/api/accountant/supervisor?id=5',
      'https://stl-ldn-api.com/api/accountant/supervisor?id=8'
    ],
    authHeader,
    ILIGAN_SET_A_ALLOWED_SUPERVISORS.length > 0 ? isIliganSetAAllowedSupervisor : null
  );

  if (Object.keys(result).length > 0) supervisorCache.set(cacheKey, result);
  return result;
}

// ─── LALA OFFICE (id=2) ──────────────────────────────────────────────────────

/**
 * Fetch supervisors for LALA OFFICE (supervisor?id=2).
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchLalaOfficeSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'LALA_OFFICE';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const authHeader = getIliganAuthHeader(gatewayEndpoints);
  const result = await fetchSupervisorsFromUrls(
    ['https://stl-ldn-api.com/api/accountant/supervisor?id=2'],
    authHeader,
    LALA_OFFICE_ALLOWED_SUPERVISORS.length > 0 ? isLalaOfficeAllowedSupervisor : null
  );

  if (Object.keys(result).length > 0) supervisorCache.set(cacheKey, result);
  return result;
}

// ─── BALOI OFFICE (id=6) ─────────────────────────────────────────────────────

/**
 * Fetch supervisors for BALOI OFFICE (supervisor?id=6).
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchBaloiOfficeSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'BALOI_OFFICE';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const authHeader = getIliganAuthHeader(gatewayEndpoints);
  const result = await fetchSupervisorsFromUrls(
    ['https://stl-ldn-api.com/api/accountant/supervisor?id=6'],
    authHeader,
    BALOI_OFFICE_ALLOWED_SUPERVISORS.length > 0 ? isBaloiOfficeAllowedSupervisor : null
  );

  if (Object.keys(result).length > 0) supervisorCache.set(cacheKey, result);
  return result;
}

/**
 * Fetch all Iligan-related supervisors (SET A + SET B + LALA OFFICE + BALOI OFFICE) merged into one map.
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchAllIliganSupervisors(gatewayEndpoints = []) {
  const [setA, setB, lala, baloi] = await Promise.all([
    fetchIliganSetASupervisors(gatewayEndpoints),
    fetchIliganSupervisors(gatewayEndpoints),
    fetchLalaOfficeSupervisors(gatewayEndpoints),
    fetchBaloiOfficeSupervisors(gatewayEndpoints)
  ]);
  return { ...setB, ...setA, ...lala, ...baloi };
}

// ─── Display Name Resolution ──────────────────────────────────────────────────

/**
 * Resolve display name for a supervisor key
 * @param {string} key - Supervisor username, ID, or handle
 * @param {Object} dynamicMap - Fetched supervisor dictionary
 * @returns {string}
 */
export function resolveSupervisorDisplayName(key, dynamicMap = {}) {
  if (!key) return 'N/A';
  const cleanKey = String(key).trim().toLowerCase();
  const prefix = cleanKey.split('@')[0];

  if (dynamicMap && dynamicMap[cleanKey]) return dynamicMap[cleanKey];
  if (dynamicMap && dynamicMap[prefix]) return dynamicMap[prefix];
  if (DEFAULT_SUPERVISOR_NAMES[cleanKey]) return DEFAULT_SUPERVISOR_NAMES[cleanKey];
  if (DEFAULT_SUPERVISOR_NAMES[prefix]) return DEFAULT_SUPERVISOR_NAMES[prefix];
  return String(key).toUpperCase();
}
