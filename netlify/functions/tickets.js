// netlify/functions/tickets.js
// Stockage GitHub (JSON) — pas de Netlify Blobs requis
// ENV requis sur Netlify: ADMIN_TOKEN, GH_TOKEN, GH_OWNER, GH_REPO, GH_BRANCH=main, GH_PATH_TICKETS=data/tickets.json

import fetch from 'node-fetch';

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
    // --- GET: list/search ---
    if (event.httpMethod === 'GET') {
      const qs = event.queryStringParameters || {};
      const q = (qs.q || '').toLowerCase().trim();
      const onlyOpen = qs.open === '1';

      const { items } = await readTickets(env);

      let out = items;
      if (q) {
        out = out.filter((t) => {
          const hay = [
            t.code || t.id || '',
            t.status || '',
            t.model || '',
            t.client || '',
            t.note || t.public_note || '',
          ]
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        });
      }
      if (onlyOpen) {
        const closed = ['livré', 'termine', 'terminé',]()
