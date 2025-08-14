const FN_MINMAX = "/.netlify/functions/prices";
const FN_STATES = "/.netlify/functions/prices_states";
const DEDUCT = {
  screen: { ok: 0, micro: 0.05, fissure: 0.15, broken: 0.40 },
  frame:  { ok: 0, wear: 0.05, bent: 0.20 },
  liquid: { none: 0, light: 0.10, heavy: 0.30 },
  defectsEach: 0.05
};
const $ = s => document.querySelector(s);
let LIVE = {};   // min/max
let STATES = {}; // per-state

const median = (min,max) => (Number(min)+Number(max))/2;
const eur = x => Math.max(0, Math.round(x));

async function loadAll(){
  const r1 = await fetch(FN_MINMAX); LIVE = await r1.json() || {};
  const r2 = await fetch(FN_STATES); STATES = await r2.json() || {};
  fillSelectors();
  compute();
}

function keys(obj){ return Object.keys(obj||{}); }

function fillSelectors(){
  const brands = Array.from(new Set([...keys(LIVE), ...keys(STATES)])).sort();
  $('#brand').innerHTML = brands.map(x=>`<option>${x}</option>`).join('') || '<option>—</option>';
  const b = $('#brand').value || brands[0];
  const models = Array.from(new Set([...(keys(LIVE[b]||{})), ...(keys(STATES[b]||{}))])).sort();
  $('#model').innerHTML = models.map(x=>`<option>${x}</option>`).join('') || '<option>—</option>';
  const m = $('#model').value || models[0];
  const storages = Array.from(new Set([...(keys(LIVE[b]?.[m]||{})), ...(keys(STATES[b]?.[m]||{}))])).sort((a,b)=>+a-+b);
  $('#storage').innerHTML = storages.map(x=>`<option>${x}</option>`).join('') || '<option>—</option>';
  updateBaseInfo();
}

function getStatePrices(b,m,s){
  try { return STATES[b][m][s].states; } catch { return null; }
}
function getMinMax(b,m,s){
  try { return LIVE[b][m][s]; } catch { return null; }
}

function updateBaseInfo(){
  const b=$('#brand').value, m=$('#model').value, s=$('#storage').value;
  const st = getStatePrices(b,m,s);
  if(st){
    const tb = st.tb || {opening:0, ceiling:0};
    $('#baseInfo').textContent = `Base (par état dispo). Ex: Très bon → ${tb.opening}–${tb.ceiling} €`;
  } else {
    const mm = getMinMax(b,m,s);
    if(!mm){ $('#baseInfo').textContent = 'Base : —'; return; }
    $('#baseInfo').textContent = `Base (min/max) : ${mm.min}–${mm.max} €`;
  }
}

function compute(){
  const b=$('#brand').value, m=$('#model').value, s=$('#storage').value;
  const etat=$('#etat').value;
  const st = getStatePrices(b,m,s);
  if($('#locked').checked){
    $('#res').textContent = 'Non reprenable (verrouillage).';
    $('#detail').textContent = '—';
    return;
  }
  if(st && st[etat]){
    const o = st[etat].opening||0, c = st[etat].ceiling||0;
    $('#res').textContent = `Ouverture : ${o} €   |   Plafond : ${c} €`;
    $('#detail').textContent = `Tarification par état (source: prices_states).`;
    return;
  }
  // fallback Mode Pro (min/max)
  const mm = getMinMax(b,m,s);
  if(!mm){
    $('#res').textContent = 'Aucun tarif pour cette config.';
    $('#detail').textContent = '—';
    return;
  }
  const screen=$('#screen').value, frame=$('#frame').value, liquid=$('#liquid').value;
  const d1 = DEDUCT.screen[screen]||0, d2 = DEDUCT.frame[frame]||0, d3 = DEDUCT.liquid[liquid]||0;
  const medAdj = median(mm.min, mm.max) * (1 - (d1+d2+d3));
  const c = eur(medAdj), o = eur(medAdj*0.90);
  $('#res').textContent = `Ouverture : ${o} €   |   Plafond : ${c} €`;
  $('#detail').textContent = `Mode Pro (fallback) — décotes écran=${(d1*100)|0}%, châssis=${(d2*100)|0}%, liquide=${(d3*100)|0}%`;
}

['#brand','#model','#storage','#etat','#screen','#frame','#liquid','#locked'].forEach(sel=>{
  document.addEventListener('change', e=>{ if(e.target.matches(sel)) { if(sel!=='#brand'&&sel!=='#model') compute(); }});
});
document.addEventListener('change', e=>{
  if(e.target.matches('#brand')) { fillSelectors(); compute(); }
  if(e.target.matches('#model')) { fillSelectors(); compute(); }
});

loadAll();
