import { getStore } from "@netlify/blobs";

const ok = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-token",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }
  });

const err = (status, message) => ok({ error: message }, status);

export default async (req) => {
  if (req.method === "OPTIONS") return ok({ ok: true });

  const store = getStore("prices");
  const key = "prices.json";

  if (req.method === "GET") {
    const json = await store.get(key, { type: "json" });
    return ok(json || {});
  }

  if (req.method === "POST") {
    const tokenHeader = req.headers.get("x-admin-token") || "";
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
    if (!ADMIN_TOKEN || tokenHeader !== ADMIN_TOKEN) return err(401, "Unauthorized");

    let incoming;
    try { incoming = await req.json(); }
    catch { return err(400, "Invalid JSON"); }

    const existing = (await store.get(key, { type: "json" })) || {};
    const merged = deepMerge(existing, incoming);
    await store.setJSON(key, merged);
    return ok({ ok: true, updated: true });
  }

  return err(405, "Method Not Allowed");
};

function deepMerge(base, add) {
  if (Array.isArray(base) || Array.isArray(add)) return add;
  if (typeof base !== "object" || typeof add !== "object" || !base || !add) return add;
  const out = { ...base };
  for (const k of Object.keys(add)) out[k] = deepMerge(base[k], add[k]);
  return out;
}
