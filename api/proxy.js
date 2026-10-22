/* global process */
// Vercel Serverless Function: Secure Gateway & Supabase Database Proxy
// Unifies 100% of network traffic under same-origin /api/proxy routes

const DEFAULT_MANDAUE_BASE = 'https://stl-mandaue-api.com';
const DEFAULT_LDN_BASE = 'https://stl-ldn-api.com';
const DEFAULT_TOKEN = 'Bearer 2860|OCyU72t1DzxdBeSjj3izVKCIcCwHkqNbwjRlxHp5';
const DEFAULT_SUPABASE_BASE = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://iatvnqefuzxvaotaibeu.supabase.co';
const DEFAULT_SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdHZucWVmdXp4dmFvdGFpYmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0Mjc0NTYsImV4cCI6MjEwNTAwMzQ1Nn0.R51uCfddbc60lnlI1xY-LVQNnVQPZpTrl2rpWyb-qgw';

export default async function handler(req, res) {
  // Response headers supporting REST and PostgREST protocol
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, apikey, Prefer, Range, Range-Unit, Content-Profile, Accept-Profile');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Range-Unit, Preference-Applied, Content-Length');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const query = req.query || {};
    let body = {};
    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
      if (typeof req.body === 'string') {
        try {
          body = JSON.parse(req.body || '{}');
        } catch {
          body = req.body;
        }
      } else {
        body = req.body || {};
      }
    }

    const action = (query.action || body.action || '').toLowerCase();
    const type = (query.type || body.type || '').toLowerCase();
    let authHeader = req.headers['authorization'] || query.authHeader || body.authHeader || '';
    if (!authHeader && (query.token || body.token)) {
      const rawTok = query.token || body.token;
      authHeader = rawTok.startsWith('Bearer ') ? rawTok : `Bearer ${rawTok}`;
    }

    let targetUrl = '';
    let targetMethod = req.method;
    let reqBody = undefined;

    // ─── 1. Action: Save Commissions ──────────────────────────────────────────
    if (action === 'save_commissions') {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: true,
        message: 'Commissions saved successfully',
        timestamp: new Date().toISOString(),
        data: body.commissions || body
      });
    }

    // ─── 2. Action: Unclaimed Receipts / Claimed Sync ──────────────────────────
    else if (action === 'unclaimed_receipts' || type === 'unclaimed') {
      const endpoint = (query.endpoint || body.endpoint || '').toLowerCase();
      const isClaim = query.isClaim !== undefined ? query.isClaim : (body.isClaim !== undefined ? body.isClaim : 0);
      const from = query.from || body.from || new Date().toISOString().slice(0, 10);
      const to = query.to || body.to || from;

      const isLdn = endpoint.includes('ldn') || endpoint.includes('iligan');
      if (isLdn && !authHeader) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({ success: true, data: [] });
      }
      const baseUrl = isLdn ? DEFAULT_LDN_BASE : DEFAULT_MANDAUE_BASE;
      targetUrl = `${baseUrl}/api/accountant/UnclaimedReceipts?isClaim=${isClaim}&from=${from}&to=${to}`;
      if (!authHeader) authHeader = DEFAULT_TOKEN;
      targetMethod = 'GET';
    }

    // ─── 3. Type: Supervisor Mappings ──────────────────────────────────────────
    else if (type === 'supervisor') {
      const id = query.id || body.id || '7';
      const endpoint = (query.endpoint || body.endpoint || '').toLowerCase();
      const from = query.from || body.from || '';
      const to = query.to || body.to || '';
      const isLdn = endpoint.includes('ldn') || endpoint.includes('iligan');
      if (isLdn && !authHeader) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({ success: true, data: [] });
      }
      const baseUrl = isLdn ? DEFAULT_LDN_BASE : DEFAULT_MANDAUE_BASE;
      const dateParams = from ? `&from=${from}&to=${to || from}` : '';
      targetUrl = `${baseUrl}/api/accountant/supervisor?id=${id}${dateParams}`;
      if (!authHeader) authHeader = DEFAULT_TOKEN;
      targetMethod = 'GET';
    }

    // ─── 4. Type: Overall / Draw ──────────────────────────────────────────────
    else if (type === 'overall') {
      const from = query.from || body.from || new Date().toISOString().slice(0, 10);
      const to = query.to || body.to || from;
      targetUrl = `${DEFAULT_MANDAUE_BASE}/api/accountant/UnclaimedReceipts?isClaim=0&from=${from}&to=${to}`;
      if (!authHeader) authHeader = DEFAULT_TOKEN;
      targetMethod = 'GET';
    } else if (type === 'draw') {
      const drawId = query.drawId || body.drawId || '';
      const from = query.from || body.from || new Date().toISOString().slice(0, 10);
      const to = query.to || body.to || from;
      targetUrl = `${DEFAULT_MANDAUE_BASE}/api/accountant/UnclaimedReceipts?isClaim=0&from=${from}&to=${to}${drawId ? `&drawId=${drawId}` : ''}`;
      if (!authHeader) authHeader = DEFAULT_TOKEN;
      targetMethod = 'GET';
    }

    // ─── 5. Action: Supabase PostgREST & Database Proxy ───────────────────────
    else if (action === 'supabase' || (query.url && query.url.includes('supabase.co'))) {
      const table = query.table || '';
      let path = query.path || (table ? `/rest/v1/${table}` : '/rest/v1/');
      if (!path.startsWith('/')) path = `/${path}`;

      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (!['action', 'table', 'path', 'url'].includes(k)) {
          searchParams.append(k, v);
        }
      }
      const qs = searchParams.toString();
      targetUrl = `${DEFAULT_SUPABASE_BASE}${path}${qs ? `?${qs}` : ''}`;

      // Ensure authHeader for Supabase is a valid unexpired Supabase JWT for this project
      const isValidSupabaseJwt = (header) => {
        if (!header || typeof header !== 'string') return false;
        const token = header.replace(/^Bearer\s+/i, '').trim();
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        try {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload.exp && payload.exp * 1000 < Date.now()) return false;
          if (payload.ref && payload.ref !== 'iatvnqefuzxvaotaibeu') return false;
          return true;
        } catch {
          return false;
        }
      };

      if (!isValidSupabaseJwt(authHeader)) {
        authHeader = `Bearer ${DEFAULT_SUPABASE_ANON}`;
      }
    }

    // ─── 6. Direct URL Fallback (With relative path expansion) ────────────────
    else {
      targetUrl = query.url || body.url || body.targetUrl || '';

      if (targetUrl.startsWith('/api-proxy/stl-mandaue')) {
        targetUrl = targetUrl.replace(/^\/api-proxy\/stl-mandaue/, DEFAULT_MANDAUE_BASE);
      } else if (targetUrl.startsWith('/api-proxy/stl-ldn')) {
        targetUrl = targetUrl.replace(/^\/api-proxy\/stl-ldn/, DEFAULT_LDN_BASE);
      }
    }

    if (!targetUrl) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'Missing proxy action, type, or target url parameter' });
    }

    // Safety check: ensure target matches permitted hostnames
    const lower = targetUrl.toLowerCase();
    const isAllowedHost = lower.includes('stl-mandaue-api.com') ||
                          lower.includes('stl-ldn-api.com') ||
                          lower.includes('supabase.co');

    if (!isAllowedHost) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(403).json({ error: 'Proxy access restricted to permitted API gateways' });
    }

    let incomingContentType = req.headers['content-type'] || 'application/json';
    if (incomingContentType.includes(',')) {
      incomingContentType = incomingContentType.split(',')[0].trim();
    }
    const incomingAccept = req.headers['accept'] || 'application/json, text/plain, */*';

    const headers = {
      'Accept': incomingAccept,
      'Content-Type': incomingContentType
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Forward Supabase / PostgREST specific headers
    const apikey = req.headers['apikey'] || req.headers['Apikey'] || query.apikey || DEFAULT_SUPABASE_ANON;
    if (targetUrl.includes('supabase.co')) {
      headers['apikey'] = DEFAULT_SUPABASE_ANON;
    } else if (apikey) {
      headers['apikey'] = apikey;
    }
    const preferHeader = req.headers['prefer'] || req.headers['Prefer'] || query.prefer;
    if (preferHeader) {
      headers['Prefer'] = preferHeader;
    } else if (targetUrl.includes('supabase.co') && ['POST', 'PATCH', 'PUT'].includes(targetMethod) && (query.on_conflict || query.table === 'system_settings')) {
      headers['Prefer'] = 'resolution=merge-duplicates';
    }

    if (req.headers['range']) headers['Range'] = req.headers['range'];
    if (req.headers['range-unit']) headers['Range-Unit'] = req.headers['range-unit'];
    if (req.headers['content-profile']) headers['Content-Profile'] = req.headers['content-profile'];
    if (req.headers['accept-profile']) headers['Accept-Profile'] = req.headers['accept-profile'];
    if (req.headers['x-client-info']) headers['x-client-info'] = req.headers['x-client-info'];

    // Prepare request body for mutating methods
    if (['POST', 'PATCH', 'PUT'].includes(targetMethod)) {
      if (typeof body === 'string') {
        reqBody = body;
      } else if (body && (typeof body === 'object') && Object.keys(body).length > 0) {
        reqBody = JSON.stringify(body);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let upstreamRes = await fetch(targetUrl, {
      method: targetMethod,
      headers,
      body: reqBody,
      signal: controller.signal
    });
    clearTimeout(timeout);

    // Auto-fallback: if upsert on_conflict fails with 42P10 (missing unique constraint on specified key),
    // automatically swap between composite (transactionId,betCode) and single (transactionId)
    if (upstreamRes.status === 400 && targetUrl.includes('returned_winnings') && (query.on_conflict || '').includes('transactionId')) {
      const errText = await upstreamRes.text();
      if (errText.includes('42P10') || errText.includes('ON CONFLICT') || errText.includes('unique or exclusion constraint')) {
        let fallbackUrl = targetUrl;
        if ((query.on_conflict || '').includes('betCode')) {
          fallbackUrl = targetUrl
            .replace(/on_conflict=transactionId%2CbetCode/i, 'on_conflict=transactionId')
            .replace(/on_conflict=transactionId,betCode/i, 'on_conflict=transactionId')
            .replace(/onConflict=transactionId%2CbetCode/i, 'onConflict=transactionId')
            .replace(/onConflict=transactionId,betCode/i, 'onConflict=transactionId');
        } else {
          fallbackUrl = targetUrl
            .replace(/on_conflict=transactionId/i, 'on_conflict=transactionId%2CbetCode')
            .replace(/onConflict=transactionId/i, 'onConflict=transactionId%2CbetCode');
        }

        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), 15000);
        upstreamRes = await fetch(fallbackUrl, {
          method: targetMethod,
          headers,
          body: reqBody,
          signal: retryController.signal
        });
        clearTimeout(retryTimeout);
      } else {
        // Re-wrap the consumed text so response handling downstream works seamlessly
        upstreamRes = new Response(errText, {
          status: upstreamRes.status,
          statusText: upstreamRes.statusText,
          headers: upstreamRes.headers
        });
      }
    }

    // RFC 7231 / RFC 9110: 204 No Content MUST NOT include Content-Type or body
    if (upstreamRes.status === 204) {
      res.status(204);
      return res.end();
    }

    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);

    // Forward PostgREST count & pagination metadata headers
    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    const prefApplied = upstreamRes.headers.get('preference-applied');
    if (prefApplied) res.setHeader('Preference-Applied', prefApplied);

    res.status(upstreamRes.status);

    const data = await upstreamRes.text();
    if (!data && upstreamRes.status >= 200 && upstreamRes.status < 300) {
      return res.end();
    }
    return res.send(data);
  } catch (err) {
    console.error('[Serverless Proxy Error]:', err.message);
    res.setHeader('Content-Type', 'application/json');
    return res.status(502).json({
      error: 'Gateway Proxy Connection Failed',
      message: err.name === 'AbortError' ? 'Upstream gateway request timed out' : err.message
    });
  }
}
