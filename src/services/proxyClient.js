/**
 * Secure Serverless Proxy Client
 * 
 * Proxies external gateway requests and Supabase database operations through the /api/proxy serverless route,
 * eliminating browser CORS violations, preventing token leaks in inspection tools,
 * and presenting clean same-origin Network entries across all pages:
 *  - /api/proxy?action=unclaimed_receipts&isClaim=0&from=...&to=...&endpoint=mandaue
 *  - /api/proxy?action=unclaimed_receipts&isClaim=1&from=...&to=...&endpoint=mandaue
 *  - /api/proxy?type=supervisor&id=...
 *  - /api/proxy?action=save_commissions
 *  - /api/proxy?action=supabase&table=returned_winnings&select=...
 *  - /api/proxy?action=supabase&table=settlement_payments&select=...
 *  - /api/proxy?action=supabase&table=unclaimed_ticket_remarks&select=...
 *  - /api/proxy?action=supabase&table=app_users&select=...
 */

/**
 * Helper to normalize and extract headers into canonical lowercase keys with deduplicated values
 */
function normalizeHeaders(headers) {
  const result = {};
  if (!headers) return result;

  const setHeader = (k, v) => {
    if (k && v !== undefined && v !== null) {
      const lowerKey = String(k).trim().toLowerCase();
      let strVal = String(v).trim();
      // Deduplicate comma-separated media types (e.g. "application/json, application/json")
      if (lowerKey === 'content-type' && strVal.includes(',')) {
        strVal = strVal.split(',')[0].trim();
      }
      result[lowerKey] = strVal;
    }
  };

  if (typeof headers.entries === 'function') {
    for (const [key, value] of headers.entries()) {
      setHeader(key, value);
    }
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      setHeader(key, value);
    }
  } else if (typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      setHeader(key, value);
    }
  }
  return result;
}

/**
 * Universal proxy fetch that transforms gateway and database queries to clean same-origin serverless URLs
 */
export async function proxyFetch(targetUrl, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    signal,
    authHeader
  } = options;

  const inputHeaders = normalizeHeaders(headers);
  if (targetUrl && typeof targetUrl === 'object' && targetUrl.headers && typeof targetUrl.headers.entries === 'function') {
    for (const [k, v] of targetUrl.headers.entries()) {
      const lower = String(k).trim().toLowerCase();
      if (!inputHeaders[lower]) {
        let strVal = String(v).trim();
        if (lower === 'content-type' && strVal.includes(',')) strVal = strVal.split(',')[0].trim();
        inputHeaders[lower] = strVal;
      }
    }
  }

  const resolvedAuth = authHeader ||
    inputHeaders['authorization'] ||
    (typeof headers?.get === 'function' ? headers.get('authorization') : '') ||
    '';
  // If request is targeting Supabase Storage, bypass proxy and use native fetch directly.
  // Supabase Storage natively supports CORS and requires direct binary streaming for File/Blob/FormData payloads.
  const targetUrlStr = typeof targetUrl === 'string' ? targetUrl : (targetUrl?.url || '');
  if (targetUrlStr.includes('/storage/v1/')) {
    return fetch(targetUrl, options);
  }

  // In browser environments, route through the serverless proxy using clean POST URLs (zero query params)
  if (typeof window !== 'undefined') {
    let payload = null;

    try {
      // Parse target URL and parameters
      const urlStr = typeof targetUrl === 'string' ? targetUrl : (targetUrl?.url || '');
      const urlObj = urlStr.startsWith('http')
        ? new URL(urlStr)
        : new URL(urlStr, window.location.origin);

      const pathname = urlObj.pathname.toLowerCase();
      const searchParams = urlObj.searchParams;
      const host = urlObj.hostname.toLowerCase();
      const isLdn = host.includes('stl-ldn') || pathname.includes('stl-ldn') || searchParams.get('endpoint') === 'ldn';
      const endpoint = isLdn ? 'ldn' : 'mandaue';

      // 1. Unclaimed Receipts
      if (pathname.includes('unclaimedreceipts') || searchParams.has('isClaim') || searchParams.get('action') === 'unclaimed_receipts') {
        payload = {
          action: 'unclaimed_receipts',
          isClaim: searchParams.get('isClaim') || '0',
          from: searchParams.get('from') || new Date().toISOString().slice(0, 10),
          to: searchParams.get('to') || searchParams.get('from') || new Date().toISOString().slice(0, 10),
          endpoint
        };
      }
      // 2. Supervisor Mappings
      else if (pathname.includes('supervisor') || (searchParams.has('type') && searchParams.get('type') === 'supervisor')) {
        payload = {
          type: 'supervisor',
          id: searchParams.get('id') || '7',
          from: searchParams.get('from') || '',
          to: searchParams.get('to') || '',
          endpoint: isLdn ? 'ldn' : 'mandaue'
        };
      }
      // 3. Save Commissions
      else if (searchParams.get('action') === 'save_commissions' || pathname.includes('save_commissions')) {
        let commissionsData = body;
        if (typeof body === 'string') {
          try { commissionsData = JSON.parse(body); } catch {}
        }
        payload = {
          action: 'save_commissions',
          commissions: (commissionsData && commissionsData.commissions) ? commissionsData.commissions : commissionsData
        };
      }
      // 4. Time Sync
      else if (searchParams.get('action') === 'time' || pathname.includes('action=time')) {
        payload = { action: 'time' };
      }
      // 5. Overall / Draw
      else if (searchParams.get('type') === 'overall') {
        payload = {
          type: 'overall',
          from: searchParams.get('from') || '',
          to: searchParams.get('to') || ''
        };
      }
      else if (searchParams.get('type') === 'draw') {
        payload = {
          type: 'draw',
          drawId: searchParams.get('drawId') || '',
          from: searchParams.get('from') || '',
          to: searchParams.get('to') || ''
        };
      }
      // 6. Supabase Database & Storage Proxy (All tables across all pages)
      else if (host.includes('supabase.co') || pathname.includes('/rest/v1/') || pathname.includes('/auth/v1/') || searchParams.get('action') === 'supabase') {
        const queryParams = {};
        for (const [k, v] of searchParams.entries()) {
          if (!['action', 'table', 'path', 'url', 'apikey', 'Apikey', 'authHeader', 'token'].includes(k)) {
            queryParams[k] = v;
          }
        }

        let table = searchParams.get('table') || '';
        let path = searchParams.get('path') || urlObj.pathname;
        if (!table && urlObj.pathname.includes('/rest/v1/')) {
          const rawSegments = urlObj.pathname.split('/').filter(Boolean);
          const v1Index = rawSegments.indexOf('v1');
          table = v1Index !== -1 && rawSegments[v1Index + 1] ? rawSegments[v1Index + 1] : '';
        }

        let parsedBody = body;
        if (typeof body === 'string') {
          try {
            parsedBody = JSON.parse(body);
          } catch {
            parsedBody = body;
          }
        }

        payload = {
          action: 'supabase',
          table,
          path,
          targetMethod: method,
          params: queryParams,
          data: parsedBody
        };
      }
      // 7. Generic Target
      else {
        let normalizedUrl = urlStr;
        if (normalizedUrl.startsWith('/api-proxy/stl-mandaue')) {
          normalizedUrl = normalizedUrl.replace(/^\/api-proxy\/stl-mandaue/, 'https://stl-mandaue-api.com');
        } else if (normalizedUrl.startsWith('/api-proxy/stl-ldn')) {
          normalizedUrl = normalizedUrl.replace(/^\/api-proxy\/stl-ldn/, 'https://stl-ldn-api.com');
        }

        let parsedBody = body;
        if (typeof body === 'string') {
          try { parsedBody = JSON.parse(body); } catch {}
        }

        payload = {
          url: normalizedUrl,
          targetMethod: method,
          data: parsedBody
        };
      }
    } catch {
      payload = {
        url: typeof targetUrl === 'string' ? targetUrl : targetUrl?.url,
        targetMethod: method,
        data: body
      };
    }

    try {
      const fetchHeaders = {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        ...inputHeaders
      };

      // Completely remove apikey and Authorization headers so they NEVER appear in DevTools Network tab
      delete fetchHeaders['apikey'];
      delete fetchHeaders['Apikey'];
      delete fetchHeaders['authorization'];
      delete fetchHeaders['Authorization'];

      // If an explicit external gateway token was provided (and it is not the Supabase token),
      // forward via internal header so it is not displayed as standard Authorization in inspection tools
      if (resolvedAuth && !resolvedAuth.includes('eyJ') && !resolvedAuth.includes('sb-proxied')) {
        fetchHeaders['x-gateway-token'] = resolvedAuth;
      }

      // Safe base64 encoding with UTF-8 support
      const safeEncode = (obj) => {
        try {
          const jsonStr = JSON.stringify(obj);
          if (typeof btoa === 'function') {
            return btoa(unescape(encodeURIComponent(jsonStr)));
          }
          return Buffer.from(jsonStr).toString('base64');
        } catch {
          return '';
        }
      };

      // Clean POST to /api/proxy (Zero query string parameters in DevTools Request URL)
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({ p: safeEncode(payload) }),
        signal
      });

      return res;
    } catch (proxyErr) {
      console.warn('[ProxyClient] Serverless proxy fetch notice:', proxyErr.message);

      // Direct fallback rewrite if serverless fails
      let fallbackUrl = typeof targetUrl === 'string' ? targetUrl : targetUrl?.url;
      if (fallbackUrl && fallbackUrl.toLowerCase().includes('stl-mandaue-api.com')) {
        fallbackUrl = fallbackUrl.replace(/https?:\/\/stl-mandaue-api\.com/i, '/api-proxy/stl-mandaue');
      } else if (fallbackUrl && fallbackUrl.toLowerCase().includes('stl-ldn-api.com')) {
        fallbackUrl = fallbackUrl.replace(/https?:\/\/stl-ldn-api\.com/i, '/api-proxy/stl-ldn');
      }

      const fallbackHeaders = {
        'accept': 'application/json, text/plain, */*',
        ...inputHeaders
      };
      if (resolvedAuth) fallbackHeaders['authorization'] = resolvedAuth;
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && !fallbackHeaders['content-type'] && body) {
        fallbackHeaders['content-type'] = 'application/json';
      }

      return fetch(fallbackUrl, {
        method,
        headers: fallbackHeaders,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        signal
      });
    }
  }

  // Non-browser / Node execution fallback
  const nodeHeaders = {
    'accept': 'application/json, text/plain, */*',
    ...inputHeaders
  };
  if (resolvedAuth) nodeHeaders['authorization'] = resolvedAuth;
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && !nodeHeaders['content-type'] && body) {
    nodeHeaders['content-type'] = 'application/json';
  }

  return fetch(targetUrl, {
    method,
    headers: nodeHeaders,
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    signal
  });
}

/**
 * Dedicated helper: Fetch Unclaimed Receipts via Serverless Proxy
 */
export async function fetchUnclaimedReceiptsViaProxy({ isClaim = 0, from, to, endpoint = 'mandaue', authHeader, signal }) {
  const url = `/api/proxy?action=unclaimed_receipts&isClaim=${isClaim}&from=${from}&to=${to}&endpoint=${endpoint}`;
  return proxyFetch(url, { method: 'GET', authHeader, signal });
}

/**
 * Dedicated helper: Fetch Supervisor Mappings via Serverless Proxy
 */
export async function fetchSupervisorViaProxy({ id = '7', from = '', to = '', endpoint = 'mandaue', authHeader, signal }) {
  const dateParams = from ? `&from=${from}&to=${to || from}` : '';
  const isLdn = endpoint.toLowerCase().includes('ldn') || endpoint.toLowerCase().includes('iligan');
  const url = `/api/proxy?type=supervisor&id=${id}${dateParams}${isLdn ? '&endpoint=ldn' : ''}`;
  return proxyFetch(url, { method: 'GET', authHeader, signal });
}

/**
 * Dedicated helper: Save Commissions via Serverless Proxy
 */
export async function saveCommissionsViaProxy(commissions = [], { authHeader, signal } = {}) {
  const url = `/api/proxy?action=save_commissions`;
  return proxyFetch(url, {
    method: 'POST',
    authHeader,
    body: { commissions },
    signal
  });
}

/**
 * Resolves an external URL to a local/same-origin proxy path
 */
export function resolveProxiedUrl(rawUrl) {
  if (!rawUrl || typeof window === 'undefined') return rawUrl;
  let clean = String(rawUrl).trim();
  if (clean.toLowerCase().includes('stl-mandaue-api.com')) {
    clean = clean.replace(/https?:\/\/stl-mandaue-api\.com/i, '/api-proxy/stl-mandaue');
  } else if (clean.toLowerCase().includes('stl-ldn-api.com')) {
    clean = clean.replace(/https?:\/\/stl-ldn-api\.com/i, '/api-proxy/stl-ldn');
  }
  return clean;
}

/**
 * Quick status check for serverless proxy connectivity
 */
export async function checkProxyHealth() {
  try {
    const res = await proxyFetch('/api/proxy?action=unclaimed_receipts&isClaim=0&from=2026-01-01&to=2026-01-01&endpoint=mandaue', {
      method: 'GET'
    });
    return res.ok;
  } catch {
    return false;
  }
}
