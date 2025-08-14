const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));

const state = {
  token: localStorage.getItem('ADMIN_TOKEN')||'',
  ns: 'clients', key: 'all', data: null,
  datasets: [
    { id:'clients', label:'Clients' },
    { id:'repairs', label:'Réparations' },
    { id:'orders', label:'Commandes' },
    { id:'tickets', label:'Tickets' },
    { id:'prices', label:'Prix' },
    { id:'states', label:'Prix par État' },
    { id:'config', label:'Config' },
    { id:'history', label:'Historique' },
  ]
};

const api = {
  async get(ns, key='all'){
    const r = await fetch(`/.netlify/functions/get-blob?ns=${encodeURIComponent(ns)}&key=${encodeURIComponent(key)}`, {
      headers: { 'x-admin-token': state.token }
    });
    if (!r.ok) throw new Error('GET failed '+r.status);
    return r.json();
  },
  async set(ns, key, data){
    const r = await fetch('/.netlify/functions/set-blob', {
      method:'POST',
      headers: { 'Content-Type':'application/json', 'x-admin-token': state.token },
      body: JSON.stringify({ ns, key, data })
    });
    if (!r.ok) throw new Error('SET failed '+r.status);
    return r.json();
  }
};

function layout(){
  $('#token').value = state.token;
  $('#saveToken').onclick = ()=>{ state.token = $('#token').value.trim(); localStorage.setItem('ADMIN_TOKEN', state.token); ping(); };
  $$('.tablink').forEach(a=>a.onclick = (e)=>{ e.preventDefault(); $$('.tablink').forEach(x=>x.classList.remove('active')); a.classList.add('active'); openTab(a.getAttribute('href').slice(1)); });
  openTab('clients');
  ping();
}

async function ping(){
  const pill = $('#ping'); pill.textContent = 'Test…';
  try{ await api.get('health','ping'); pill.textContent = 'Connecté'; }
  catch{ pill.textContent = 'Non connecté'; }
}

function editorView(ns){
  state.ns = ns;
  const html = `
    <div class="card">
      <div class="kv">
        <div><b>Dataset</b></div><div><code>${ns}</code></div>
        <div><b>Clé</b></div><div><input id="key" value="all"/></div>
      </div>
      <div class="toolbar" style="margin:12px 0">
        <button class="btn" id="load">Charger</button>
        <button class="btn out" id="save">Enregistrer</button>
        <button class="btn out" id="seed">Seeder</button>
        <span class="small muted">JSON. Raccourci : <i>Ctrl/Cmd + S</i>.</span>
      </div>
      <textarea id="json" placeholder='[ ] ou { }'></textarea>
      <div class="small muted" style="margin-top:6px">Astuce : mets un objet avec un champ <code>id</code> (ex: numéro, téléphone).</div>
    </div>`;
  $('#view').innerHTML = html;
  $('#load').onclick = loadJSON;
  $('#save').onclick = saveJSON;
  $('#seed').onclick = seedJSON;
  $('#json').addEventListener('keydown', e=>{
    if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); saveJSON(); }
  });
  loadJSON();
}

async function loadJSON(){
  const key = $('#key').value.trim() || 'all';
  try{
    const res = await api.get(state.ns, key);
    const data = res.data ?? (state.ns==='prices' ? {"items": []} : []);
    state.key = key; state.data = data;
    $('#json').value = JSON.stringify(data, null, 2);
  }catch(e){ alert('Erreur de chargement : '+e.message); }
}

async function saveJSON(){
  const key = $('#key').value.trim() || 'all';
  let data;
  try{ data = JSON.parse($('#json').value || 'null'); }
  catch(e){ return alert('JSON invalide : '+e.message); }
  try{
    await api.set(state.ns, key, data);
    alert('Enregistré ✔');
  }catch(e){ alert('Erreur d\'enregistrement : '+e.message); }
}

async function seedJSON(){
  const templates = {
    clients: [{ id: 1, name: "Client test", phone: "0612345678" }],
    repairs: [{ id: 1, client_id: 1, device: "iPhone 13", issue: "Écran", status: "Nouveau" }],
    orders: [{ id: 1, ref: "CMD-0001", items: 3, total: 149.9 }],
    tickets: [{ id: 1, title: "Ticket test", status: "ouvert" }],
    prices: { items: [{ brand: "Apple", model: "iPhone 13", storage: 128, price: 371 }] },
    states: [{ state: "Neuf", min: 300, max: 400 }],
    config: { shop: "Dr Phone", phone: "03 62 02 06 22" },
    history: [{ id: 1, action: "seed", at: new Date().toISOString() }]
  };
  $('#json').value = JSON.stringify(templates[state.ns] ?? [], null, 2);
}

function openTab(id){
  if (!state.datasets.some(d=>d.id===id)) id = 'clients';
  editorView(id);
}

document.addEventListener('DOMContentLoaded', layout);
