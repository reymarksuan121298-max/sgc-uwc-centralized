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

  const resolvedAuth = authHeader || headers['Authorization'] || headers['authorization'] || '';

  // In browser environments, route through the serverless proxy
  if (typeof window !== 'undefined') {
    let proxyUrl;

    // Check if targetUrl is already an /api/proxy endpoint
    if (typeof targetUrl === 'string' && targetUrl.startsWith('/api/proxy')) {
      proxyUrl = targetUrl;
    } else {
      try {
        // Parse the target URL to extract parameters
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
        if (pathname.includes('unclaimedreceipts') || searchParams.has('isClaim')) {
          const isClaim = searchParams.get('isClaim') || '0';
          const from = searchParams.get('from') || new Date().toISOString().slice(0, 10);
          const to = searchParams.get('to') || from;
          proxyUrl = `/api/proxy?action=unclaimed_receipts&isClaim=${isClaim}&from=${from}&to=${to}&endpoint=${endpoint}`;
        }
        // 2. Supervisor Mappings
        else if (pathname.includes('supervisor') || searchParams.has('type') && searchParams.get('type') === 'supervisor') {
          const id = searchParams.get('id') || '7';
          const from = searchParams.get('from') || '';
          const to = searchParams.get('to') || '';
          const datePart = from ? `&from=${from}&to=${to || from}` : '';
          proxyUrl = `/api/proxy?type=supervisor&id=${id}${datePart}${isLdn ? '&endpoint=ldn' : ''}`;
        }
        // 3. Save Commissions
        else if (searchParams.get('action') === 'save_commissions' || pathname.includes('save_commissions')) {
          proxyUrl = `/api/proxy?action=save_commissions`;
        }
        // 4. Overall / Draw
        else if (searchParams.get('type') === 'overall') {
          const from = searchParams.get('from') || '';
          const to = searchParams.get('to') || '';
          proxyUrl = `/api/proxy?type=overall&from=${from}&to=${to}`;
        }
        else if (searchParams.get('type') === 'draw') {
          const drawId = searchParams.get('drawId') || '';
          const from = searchParams.get('from') || '';
          const to = searchParams.get('to') || '';
          proxyUrl = `/api/proxy?type=draw&drawId=${drawId}&from=${from}&to=${to}`;
        }
        // 5. Supabase Database & Storage Proxy (All tables across all pages)
        else if (host.includes('supabase.co') || pathname.includes('/rest/v1/') || pathname.includes('/storage/v1/') || pathname.includes('/auth/v1/')) {
          const cleanParams = new URLSearchParams(searchParams);
          cleanParams.set('action', 'supabase');

          if (pathname.includes('/rest/v1/')) {
            const rawSegments = urlObj.pathname.split('/').filter(Boolean);
            const v1Index = rawSegments.indexOf('v1');
            const table = v1Index !== -1 && rawSegments[v1Index + 1] ? rawSegments[v1Index + 1] : '';
            if (table) {
              cleanParams.set('table', table);
            } else {
              cleanParams.set('path', urlObj.pathname);
            }
          } else {
            cleanParams.set('path', urlObj.pathname);
          }

          proxyUrl = `/api/proxy?${cleanParams.toString()}`;
        }
        // 6. Generic Gateway Target
        else {
          let normalizedUrl = urlStr;
          if (normalizedUrl.startsWith('/api-proxy/stl-mandaue')) {
            normalizedUrl = normalizedUrl.replace(/^\/api-proxy\/stl-mandaue/, 'https://stl-mandaue-api.com');
          } else if (normalizedUrl.startsWith('/api-proxy/stl-ldn')) {
            normalizedUrl = normalizedUrl.replace(/^\/api-proxy\/stl-ldn/, 'https://stl-ldn-api.com');
          }

          if (method === 'GET') {
            proxyUrl = `/api/proxy?url=${encodeURIComponent(normalizedUrl)}`;
          } else {
            proxyUrl = '/api/proxy';
          }
        }
      } catch {
        proxyUrl = '/api/proxy';
      }
    }

    try {
      const fetchHeaders = {
        'Accept': 'application/json, text/plain, */*',
        ...headers
      };
      if (resolvedAuth) {
        fetchHeaders['Authorization'] = resolvedAuth;
      }

      let fetchBody = undefined;
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
        if (!fetchHeaders['Content-Type'] && body) {
          fetchHeaders['Content-Type'] = 'application/json';
        }
        if (proxyUrl === '/api/proxy') {
          fetchBody = JSON.stringify({
            url: typeof targetUrl === 'string' ? targetUrl : targetUrl?.url,
            method,
            authHeader: resolvedAuth,
            data: body
          });
        } else if (body !== undefined && body !== null) {
          fetchBody = typeof body === 'string' ? body : JSON.stringify(body);
        }
      }

      const res = await fetch(proxyUrl, {
        method,
        headers: fetchHeaders,
        body: fetchBody,
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

      return fetch(fallbackUrl, {
        method,
        headers: {
          'Authorization': resolvedAuth,
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        signal
      });
    }
  }

  // Non-browser / Node execution fallback
  return fetch(targetUrl, {
    method,
    headers: {
      'Authorization': resolvedAuth,
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      ...headers
    },
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
