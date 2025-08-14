import { getStore } from '@netlify/blobs';

const ok = (body, status=200) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  },
  body: JSON.stringify(body)
});

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return ok({ ok: true });
  const token = event.headers['x-admin-token'] || (event.headers['authorization']||'').replace(/^Bearer\s+/i,'');
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return ok({ error: 'unauthorized' }, 401);
  }
  if (event.httpMethod !== 'GET') return ok({ error: 'method_not_allowed' }, 405);

  const params = event.queryStringParameters || {};
  const ns = params.ns || 'general';
  const key = params.key || 'all';

  try {
    const store = getStore(ns);
    const val = await store.get(key, { type: 'json' });
    return ok({ ns, key, data: val ?? null });
  } catch (e) {
    return ok({ error: String(e) }, 500);
  }
}
