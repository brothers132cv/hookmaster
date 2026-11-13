/**
 * HookMaster media worker (Cloudflare Workers + R2)
 *   PUT /upload/<folder>/<file>  staff only (Firebase ID token) -> stores in R2
 *   GET /m/<folder>/<file>       public, CORS + Range (needed by the editor)
 *
 * Vars (wrangler.toml): FIREBASE_PROJECT_ID, ADMIN_EMAIL, ALLOWED_ORIGINS
 * Binding: MEDIA (R2 bucket)
 */

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const MAX_BYTES = 150 * 1024 * 1024;
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/wav'];
const FOLDERS = ['hooks', 'posters', 'music'];

function cors(env, req) {
  const origins = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  const o = req.headers.get('Origin');
  const h = {
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    'Vary': 'Origin'
  };
  h['Access-Control-Allow-Origin'] = o && origins.includes(o) ? o : origins[0] || '*';
  return h;
}

const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const json = o => JSON.parse(new TextDecoder().decode(b64u(o)));

async function verifyFirebaseToken(token, env) {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) throw new Error('bad token');
  const header = json(h), claims = json(p);
  if (header.alg !== 'RS256') throw new Error('bad alg');
  const jwks = await (await fetch(JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } })).json();
  const jwk = jwks.keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(s), new TextEncoder().encode(`${h}.${p}`));
  const now = Date.now() / 1000;
  if (!ok || claims.aud !== env.FIREBASE_PROJECT_ID || claims.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}` || claims.exp < now || !claims.sub) {
    throw new Error('invalid claims');
  }
  return claims;
}

/** Staff = admin email, or has a doc in Firestore staff/<email> (checked with the user's own token). */
async function isStaff(claims, token, env) {
  const email = (claims.email || '').toLowerCase();
  if (!email || claims.email_verified !== true) return false;
  if (email === env.ADMIN_EMAIL.toLowerCase()) return true;
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/staff/${encodeURIComponent(email)}`;
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  return r.status === 200;
}

export default {
  async fetch(req, env) {
    const c = cors(env, req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: c });
    const url = new URL(req.url);

    // ---- Upload ----
    if (req.method === 'PUT' && url.pathname.startsWith('/upload/')) {
      const key = decodeURIComponent(url.pathname.slice('/upload/'.length));
      if (!/^(hooks|posters|music)\/[a-z0-9._-]+$/.test(key) || key.includes('..') || !FOLDERS.includes(key.split('/')[0])) {
        return new Response('Bad key', { status: 400, headers: c });
      }
      const type = (req.headers.get('Content-Type') || '').split(';')[0];
      if (!ALLOWED_TYPES.includes(type)) return new Response('Unsupported type', { status: 415, headers: c });
      const len = Number(req.headers.get('Content-Length') || 0);
      if (!len || len > MAX_BYTES) return new Response('File too large (max 150MB)', { status: 413, headers: c });

      const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
      try {
        const claims = await verifyFirebaseToken(token, env);
        if (!(await isStaff(claims, token, env))) return new Response('Forbidden', { status: 403, headers: c });
      } catch (e) { return new Response('Unauthorized', { status: 401, headers: c }); }

      await env.MEDIA.put(key, req.body, { httpMetadata: { contentType: type } });
      return new Response('ok', { status: 200, headers: c });
    }

    // ---- Public media (Range supported) ----
    if (req.method === 'GET' && url.pathname.startsWith('/m/')) {
      const key = decodeURIComponent(url.pathname.slice(3));
      const obj = await env.MEDIA.get(key, { range: req.headers });
      if (!obj) return new Response('Not found', { status: 404, headers: c });
      const h = new Headers(c);
      obj.writeHttpMetadata(h);
      h.set('Accept-Ranges', 'bytes');
      h.set('Cache-Control', 'public, max-age=31536000, immutable');
      h.set('ETag', obj.httpEtag);
      let status = 200;
      if (obj.range) {
        status = 206;
        const { offset = 0, length = obj.size - offset } = obj.range;
        h.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${obj.size}`);
        h.set('Content-Length', String(length));
      } else h.set('Content-Length', String(obj.size));
      return new Response(obj.body, { status, headers: h });
    }

    return new Response('HookMaster media worker', { status: 200, headers: c });
  }
};
