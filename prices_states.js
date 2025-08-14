// v29.2 — Prix par état (4 états) + seed ~100 configs
// GET  => renvoie l’arbre { brand -> model -> storage -> {states:{...}} }
// POST => merge des données (auth via ADMIN_TOKEN)
// Stockage: Netlify Blobs ("prices_states.json")

import { getStore } from "@netlify/blobs";

// --------- helpers HTTP ----------
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

// --------- modèle de calcul ----------
/**
 * On part d'une "médiane base" (med) par modèle/stockage, puis:
 * - Neuf   : 100% de med
 * - Très bon : 90%
 * - Bon    : 78%
 * - Cassé  : 35%
 * Pour chaque état, on publie ouverture/plafond = medEtat ± spread
 * - spreadNeuf = 30 ; spreadAutres = 25 (euros)
 */
const MULT = { neuf: 1.00, tb: 0.90, bon: 0.78, casse: 0.35 };
const SPREAD = { neuf: 30, tb: 25, bon: 25, casse: 25 };

function statesFromMedian(baseMed) {
  const out = {};
  for (const k of ["neuf", "tb", "bon", "casse"]) {
    const med = Math.round(baseMed * MULT[k]);
    const s = SPREAD[k];
    out[k] = { opening: Math.max(0, med - s), ceiling: med + s };
  }
  return out;
}

function setPath(tree, brand, model, storage, val) {
  if (!tree[brand]) tree[brand] = {};
  if (!tree[brand][model]) tree[brand][model] = {};
  tree[brand][model][String(storage)] = val;
}

// --------- SEED compact (≈100 configs via générateurs) ----------
function seedData() {
  const L = [];

  // APPLE: iPhone 11 -> 16 Pro Max
  const appleBase = {
    "iPhone 11": {128: 220},
    "iPhone 11 Pro": {256: 300},
    "iPhone 12": {128: 300, 256: 340},
    "iPhone 12 Pro": {256: 380},
    "iPhone 13": {128: 360, 256: 420},
    "iPhone 13 Pro": {256: 520},
    "iPhone 14": {128: 450, 256: 520},
    "iPhone 14 Pro": {256: 620},
    "iPhone 15": {128: 520, 256: 560},
    "iPhone 15 Pro": {256: 680},
    "iPhone 15 Pro Max": {256: 740, 512: 820},
    "iPhone 16": {128: 650, 256: 700},
    "iPhone 16 Pro": {256: 820},
    "iPhone 16 Pro Max": {256: 880, 512: 980}
  };
  for (const [model, storMap] of Object.entries(appleBase)) {
    for (const [storage, med] of Object.entries(storMap)) {
      L.push({ brand: "Apple", model, storage: Number(storage), baseMed: med });
    }
  }

  // SAMSUNG: S21 -> S24 Ultra, Z Flip 3->5, Z Fold 3->5, A-série récentes
  const samsung = [
    ["Galaxy S21", 128, 280], ["Galaxy S21+", 256, 340], ["Galaxy S21 Ultra", 256, 420],
    ["Galaxy S22", 128, 360], ["Galaxy S22+", 256, 440], ["Galaxy S22 Ultra", 256, 520],
    ["Galaxy S23", 128, 460], ["Galaxy S23+", 256, 540], ["Galaxy S23 Ultra", 256, 620],
    ["Galaxy S24", 128, 520], ["Galaxy S24+", 256, 600], ["Galaxy S24 Ultra", 256, 700],
    ["Galaxy Z Flip 3", 128, 320], ["Galaxy Z Flip 4", 256, 420], ["Galaxy Z Flip 5", 256, 520],
    ["Galaxy Z Fold 3", 256, 520], ["Galaxy Z Fold 4", 512, 720], ["Galaxy Z Fold 5", 512, 880],
    ["Galaxy A15", 128, 140], ["Galaxy A35", 128, 220], ["Galaxy A55", 128, 280]
  ];
  for (const [model, storage, med] of samsung) L.push({ brand: "Samsung", model, storage, baseMed: med });

  // GOOGLE: Pixel 6 -> 8 Pro, 8a, Fold
  const pixels = [
    ["Pixel 6", 128, 260], ["Pixel 6 Pro", 256, 330],
    ["Pixel 7", 128, 340], ["Pixel 7 Pro", 256, 420],
    ["Pixel 8", 128, 420], ["Pixel 8 Pro", 256, 520],
    ["Pixel 8a", 128, 360], ["Pixel Fold", 512, 820]
  ];
  for (const [model, storage, med] of pixels) L.push({ brand: "Google", model, storage, baseMed: med });

  // ONEPLUS
  const oneplus = [
    ["OnePlus 9", 128, 260], ["OnePlus 10 Pro", 256, 380],
    ["OnePlus 11", 256, 460], ["OnePlus 12", 256, 480],
    ["OnePlus 13", 256, 600], ["Nord 4", 128, 260], ["Nord CE 4", 128, 220]
  ];
  for (const [model, storage, med] of oneplus) L.push({ brand: "OnePlus", model, storage, baseMed: med });

  // XIAOMI
  const xiaomis = [
    ["Xiaomi 12", 256, 340], ["Xiaomi 13", 256, 420], ["Xiaomi 13 Pro", 256, 520],
    ["Xiaomi 14", 256, 520], ["Xiaomi 14 Ultra", 512, 700],
    ["13T Pro", 256, 400], ["Redmi Note 13", 128, 160], ["Redmi Note 13 Pro+", 256, 220]
  ];
  for (const [model, storage, med] of xiaomis) L.push({ brand: "Xiaomi", model, storage, baseMed: med });

  // OPPO
  const oppo = [
    ["Find X3 Pro", 256, 400], ["Find X5 Pro", 256, 520], ["Find X6 Pro", 512, 640],
    ["Reno 8 Pro", 256, 300], ["Reno 10 Pro+", 256, 360], ["Reno 12 Pro", 256, 380]
  ];
  for (const [model, storage, med] of oppo) L.push({ brand: "Oppo", model, storage, baseMed: med });

  // HONOR / HUAWEI / NOTHING / SONY / ASUS / REALME / MOTOROLA / VIVO
  const others = [
    ["Honor", "Magic 6", 256, 480], ["Honor", "Magic 6 Pro", 256, 560], ["Honor", "Magic V2", 512, 700],
    ["Huawei", "Pura 70 Pro", 256, 620], ["Huawei", "Mate 60 Pro", 256, 580],
    ["Nothing", "Phone (2)", 256, 360], ["Nothing", "Phone (2a)", 256, 300],
    ["Sony", "Xperia 1 VI", 256, 520], ["Sony", "Xperia 5 V", 128, 360],
    ["Asus", "ROG Phone 8", 256, 520], ["Asus", "Zenfone 10", 128, 360],
    ["Realme", "GT 6", 256, 360], ["Realme", "12 Pro+", 256, 280],
    ["Motorola", "Edge 50 Pro", 256, 360], ["Motorola", "Razr 50", 256, 420],
    ["Vivo", "X100 Pro", 512, 620], ["Vivo", "V30 Pro", 256, 300]
  ];
  for (const [brand, model, storage, med] of others) L.push({ brand, model, storage, baseMed: med });

  return L;
}

function buildSeedTree() {
  const rows = seedData();
  const tree = {};
  for (const { brand, model, storage, baseMed } of rows) {
    setPath(tree, brand, model, storage, { states: statesFromMedian(baseMed) });
  }
  return tree;
}

// --------- deep merge pour POST ----------
function deepMerge(base, add) {
  if (Array.isArray(base) || Array.isArray(add)) return add;
  if (typeof base !== "object" || typeof add !== "object" || !base || !add) return add;
  const out = { ...base };
  for (const k of Object.keys(add)) out[k] = deepMerge(base[k], add[k]);
  return out;
}

// --------- handler ----------
export default async (req) => {
  if (req.method === "OPTIONS") return ok({ ok: true });

  const store = getStore("prices");
  const key = "prices_states.json";

  if (req.method === "GET") {
    let json = await store.get(key, { type: "json" });
    if (!json || Object.keys(json).length === 0) {
      // Première mise en route : injecte le SEED
      json = buildSeedTree();
      await store.setJSON(key, json);
    }
    return ok(json);
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
