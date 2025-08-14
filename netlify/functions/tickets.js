// ENV: ADMIN_TOKEN, GH_TOKEN, GH_OWNER, GH_REPO, GH_BRANCH=main, GH_PATH_TICKETS=data/tickets.json
const GITHUB_API = 'https://api.github.com';

const ok = (body, status = 200) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

const ghHeaders = (token) => ({
  Authorization: `token ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'drphonenord-admin',
});

async function readTickets(env) {
  const path = env.GH_PATH_TICKETS || 'data/tickets.json';
  const branch = env.GH_BRANCH || 'main';
  const url = `${GITHUB_API}/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: ghHeaders(env.GH_TOKEN) });
  if (res.status === 404) return { items: [], sha: null, path };
  if (!res.ok) throw new Error(`github_read_${res.status}:${await res.text()}`);
  const j = await res.json();
  const content = Buffer.from(j.content || '', 'base64').toString('utf-8');
  const arr = content ? JSON.parse(content) : [];
  return { items: Array.isArray(arr) ? arr : [], sha: j.sha, path };
}

async function writeTickets(env, items, sha, message = 'admin: update tickets') {
  const path = env.GH_PATH_TICKETS || 'data/tickets.json';
  const branch = env.GH_BRANCH || 'main';
  const url = `${GITHUB_API}/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${encodeURIComponent(path)}`;
  const content = Buffer.from(JSON.stringify(items, null, 2)).toString('base64');
  const res = await fetch(url, {
    method: 'PUT',
    headers: ghHeaders(env.GH_TOKEN),
    body: JSON.stringify({ message, content, sha, branch }),
  });
  if (!res.ok) throw new Error(`github_write_${res.status}:${await res.text()}`);
  const j = await res.json();
  return j.commit?.sha || null;
}

const genCode = () => {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
  return `DRP-${y}-${n}`;
};

export async function handler(event) {
  try {
    if (event.httpMethod === 'OPTIONS') return ok({ ok: true });
    const env = process.env;

    if (event.httpMethod === 'GET') {
      const qs = event.queryStringParameters || {};
      const q = (qs.q || '').toLowerCase().trim();
      const onlyOpen = qs.open === '1';
      const { items } = await readTickets(env);
      let out = items;
      if (q) {
        out = out.filter((t) => {
          const hay = [t.code || t.id || '', t.status || '', t.model || '', t.client || '', t.note || t.public_note || ''].join(' ').toLowerCase();
          return hay.includes(q);
        });
      }
      if (onlyOpen) {
        const closed = ['livré', 'termine', 'terminé', 'restitué', 'prêt · à restituer'];
        out = out.filter((t) => !closed.includes(String(t.status || '').toLowerCase()));
      }
      out = out.map((t) => ({
        code: t.code || t.id || '',
        status: t.status || '',
        model: t.model || t.device || '',
        client: t.client || '',
        updated: t.updated_at || t.updatedAt || '',
      })).slice(-200).reverse();
      return ok({ items: out });
    }

    if (event.httpMethod === 'POST') {
      const token = event.headers['x-admin-token'] || (event.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return ok({ error: 'unauthorized' }, 401);
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch { return ok({ error: 'invalid_json' }, 400); }
      const { items, sha } = await readTickets(env);
      const nowIso = new Date().toISOString();
      const payload = {
        code: (body.code || '').trim() || genCode(),
        id: (body.code || '').trim() || genCode(),
        status: (body.status || 'Réceptionné').trim(),
        model: (body.model || '').trim(),
        client: (body.client || '').trim(),
        note: (body.note || '').trim(),
        phone: (body.phone || '').trim(),
        updated_at: nowIso,
      };
      const idx = items.findIndex((t) => String(t.code || t.id) === payload.code);
      if (idx >= 0) items[idx] = { ...items[idx], ...payload };
      else items.push(payload);
      const commitSha = await writeTickets(env, items, sha, `admin: save ${payload.code}`);
      return ok({ ok: true, item: payload, commit: commitSha });
    }

    return ok({ error: 'method_not_allowed' }, 405);
  } catch (e) {
    return ok({ error: String(e) }, 500);
  }
}
