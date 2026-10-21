// SPP - Naver login bridge (Cloudflare Worker, free plan).
// The game sends the Naver authorization code here; this worker swaps it for the Naver user id (with the client secret,
// which never reaches the browser) and returns a Firebase custom token signed with the service-account key.
// Secrets live only in Cloudflare (Settings -> Variables and Secrets):
//   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, FIREBASE_SERVICE_ACCOUNT (the whole service-account JSON)
const ORIGIN = 'https://hooni9807.github.io';

export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
    try {
      const { code, state } = await req.json();
      if (!code || !state) return json({ error: 'missing code' }, 400);
      // 1) authorization code -> Naver access token
      const t = await (await fetch('https://nid.naver.com/oauth2.0/token?' + new URLSearchParams({
        grant_type: 'authorization_code', client_id: env.NAVER_CLIENT_ID, client_secret: env.NAVER_CLIENT_SECRET, code, state }))).json();
      if (!t.access_token) return json({ error: 'naver token', detail: t.error_description || t.error }, 401);
      // 2) access token -> Naver profile (only the id and the nickname are used)
      const me = await (await fetch('https://openapi.naver.com/v1/nid/me', { headers: { Authorization: 'Bearer ' + t.access_token } })).json();
      if (!me.response || !me.response.id) return json({ error: 'naver profile' }, 401);
      // 3) Firebase custom token for uid "naver:<id>"
      const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
      const token = await customToken(sa, 'naver:' + me.response.id);
      return json({ token, nickname: (me.response.nickname || '').slice(0, 12) });
    } catch (e) {
      return json({ error: 'server', detail: String(e) }, 500);
    }
  }
};

async function customToken(sa, uid) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = o => btoa(typeof o === 'string' ? o : String.fromCharCode(...new Uint8Array(o))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const head = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64(unescape(encodeURIComponent(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email, uid, iat: now, exp: now + 3600,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit' }))));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + body));
  return head + '.' + body + '.' + b64(sig);
}
