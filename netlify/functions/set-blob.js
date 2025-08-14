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
  if (event.httpMethod !== 'POST') return ok({ error: 'method_not_allowed' }, 405);

  let body;
  try { body = JSON.parse(event.body||'{}'); } catch { body = {}; }
  const ns = body.ns || 'general';
  const key = body.key || 'all';
  const data = body.data;

  try {
    const store = getStore(ns);
    await store.set(key, data);
    return ok({ ns, key, ok: true });
  } catch (e) {
    return ok({ error: String(e) }, 500);
  }
}
