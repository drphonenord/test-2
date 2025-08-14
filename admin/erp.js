
// Simple ERP front — talks to Netlify Functions (clients/repairs/orders/history/config)
const $ = s => document.querySelector(s);
const $v = id => document.getElementById(id);
const tokenKey = 'drp_admin_token';
const getTok = () => (localStorage.getItem(tokenKey) || $v('token').value || '').trim();
const H = (html) => html;

function setActive(hash){ document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active', a.getAttribute('href')===hash)); }
function route(){
  const hash = location.hash || '#dashboard';
  setActive(hash);
  if($('#q')) $('#q').value='';
  if(hash==='#dashboard') return renderDashboard();
  if(hash==='#clients') return renderClients();
  if(hash==='#repairs') return renderRepairs();
  if(hash==='#orders') return renderOrders();
  if(hash==='#history') return renderHistory();
  if(hash==='#config') return renderConfig();
}

window.addEventListener('hashchange', route);
window.addEventListener('load', () => {
  const saved = localStorage.getItem(tokenKey);
  if(saved) $v('token').value = saved;
  $v('saveToken').onclick = ()=>{ localStorage.setItem(tokenKey, $v('token').value.trim()); alert('Token enregistré.'); };
  route();
});

// -------- API helpers --------
async function api(fn, method='GET', body=null){
  const h = { 'Content-Type':'application/json' };
  const tok = getTok(); if(tok) h['x-admin-token'] = tok;
  const r = await fetch('/.netlify/functions/'+fn, { method, headers:h, body: body?JSON.stringify(body):null, cache:'no-store' });
  const t = await r.text();
  let j = null; try{ j = JSON.parse(t); }catch{}
  if(!r.ok){ throw new Error((j&&j.error)||('HTTP '+r.status+': '+t)); }
  return j;
}

// -------- Dashboard --------
async function renderDashboard(){
  const wrap = $('#view');
  wrap.innerHTML = H(`
    <div class="card">
      <h3>Vue rapide</h3>
      <div class="grid g3">
        <div><div class="badge">Clients</div><div id="kpiClients" class="status">—</div></div>
        <div><div class="badge">Réparations actives</div><div id="kpiRepairs" class="status">—</div></div>
        <div><div class="badge">Commandes (30j)</div><div id="kpiOrders" class="status">—</div></div>
      </div>
    </div>
  `);
  try{
    const [clients, repairs, orders] = await Promise.all([api('clients'), api('repairs'), api('orders')]);
    $('#kpiClients').textContent = (clients.items||[]).length;
    $('#kpiRepairs').textContent = (repairs.items||[]).filter(x=>x.status!=='livré' && x.status!=='annulé').length;
    $('#kpiOrders').textContent = (orders.items||[]).filter(x=>Date.now() - (new Date(x.date)).getTime() < 30*864e5).length;
  }catch(e){
    wrap.insertAdjacentHTML('beforeend', `<p class="muted small">Erreur dashboard: ${e.message}</p>`);
  }
}

// -------- Clients --------
async function renderClients(){
  const wrap = $('#view');
  wrap.innerHTML = H(`
    <div class="card">
      <div class="grid g3">
        <div><label>Nom</label><input id="c_name"></div>
        <div><label>Téléphone</label><input id="c_phone" placeholder="+33 …"></div>
        <div><label>Email</label><input id="c_email"></div>
        <div class="g3" style="grid-column:1/-1;display:grid;gap:8px">
          <div><label>Notes</label><input id="c_notes"></div>
          <div><label>&nbsp;</label><button class="btn" id="btnAdd">Ajouter client</button></div>
          <div><label>&nbsp;</label><button class="btn out" id="btnExport">Exporter CSV</button></div>
        </div>
      </div>
    </div>
    <div class="card">
      <h3>Clients</h3>
      <input id="c_filter" placeholder="Filtrer (nom/tel/email)" style="margin-bottom:8px">
      <table id="tbl">
        <thead><tr><th>Nom</th><th>Téléphone</th><th>Email</th><th>Notes</th><th>Créé</th><th>Actions</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  `);
  $('#btnAdd').onclick = async ()=>{
    const item = { id: crypto.randomUUID(), name:$v('c_name').value.trim(), phone:$v('c_phone').value.trim(), email:$v('c_email').value.trim(), notes:$v('c_notes').value.trim(), created: new Date().toISOString() };
    if(!item.name) return alert("Nom obligatoire");
    await api('clients','POST',{ action:'upsert', item });
    route();
  };
  $('#btnExport').onclick = async ()=>{
    const data = await api('clients');
    const rows = (data.items||[]).map(x=>[x.name,x.phone,x.email,(x.notes||'').replaceAll('\n',' '),x.created]);
    const csv = ['Nom;Téléphone;Email;Notes;Créé', ...rows.map(r=>r.map(v=>`"${(v||'').toString().replaceAll('"','""')}"`).join(';'))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='clients.csv'; a.click();
  };
  const data = await api('clients');
  const tbody = $('#tbl tbody');
  const list = data.items||[];
  const draw = ()=>{
    const q = ($v('c_filter').value||'').toLowerCase();
    tbody.innerHTML = '';
    list.filter(x=>(`${x.name} ${x.phone} ${x.email}`).toLowerCase().includes(q)).forEach(x=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input value="${x.name||''}" data-k="name"></td>
      <td><input value="${x.phone||''}" data-k="phone"></td>
      <td><input value="${x.email||''}" data-k="email"></td>
      <td><input value="${x.notes||''}" data-k="notes"></td>
      <td>${new Date(x.created).toLocaleDateString()}</td>
      <td><button class="btn out" data-act="save" data-id="${x.id}">Sauver</button> <button class="btn out" data-act="del" data-id="${x.id}">Supprimer</button></td>`;
      tbody.appendChild(tr);
    });
  };
  draw();
  $v('c_filter').oninput = draw;
  tbody.addEventListener('click', async (e)=>{
    const b = e.target.closest('button'); if(!b) return;
    const id = b.dataset.id; const act = b.dataset.act;
    const tr = b.closest('tr');
    const [nameInp,phoneInp,emailInp,notesInp] = tr.querySelectorAll('input');
    if(act==='save'){
      await api('clients','POST',{ action:'upsert', item:{ id, name:nameInp.value, phone:phoneInp.value, email:emailInp.value, notes:notesInp.value } });
      alert('Client mis à jour');
    }else if(act==='del'){
      if(confirm('Supprimer ce client ?')){ await api('clients','POST',{ action:'delete', id }); tr.remove(); }
    }
  });
}

// -------- Repairs --------
async function renderRepairs(){
  const wrap = $('#view');
  wrap.innerHTML = H(`
    <div class="card">
      <div class="grid g3">
        <div><label>Client (nom)</label><input id="r_client"></div>
        <div><label>Appareil</label><input id="r_device" placeholder="iPhone 14, Galaxy S24…"></div>
        <div><label>Problème</label><input id="r_issue" placeholder="Écran, batterie, charge…"></div>
        <div><label>Devis (€)</label><input id="r_quote" type="number" min="0"></div>
        <div><label>Statut</label>
          <select id="r_status">
            <option value="en attente">En attente</option>
            <option value="en cours">En cours</option>
            <option value="terminé">Terminé</option>
            <option value="livré">Livré</option>
            <option value="annulé">Annulé</option>
          </select>
        </div>
        <div style="display:flex;align-items:end"><button class="btn" id="r_add">Ajouter réparation</button></div>
      </div>
    </div>
    <div class="card">
      <h3>Réparations</h3>
      <div class="grid g2">
        <input id="r_filter" placeholder="Filtrer (client/appareil/problème)">
        <select id="r_filter_status">
          <option value="">Tous statuts</option>
          <option>en attente</option><option>en cours</option><option>terminé</option><option>livré</option><option>annulé</option>
        </select>
      </div>
      <table id="rtbl">
        <thead><tr><th>Client</th><th>Appareil</th><th>Problème</th><th>Devis</th><th>Statut</th><th>Créé</th><th>Actions</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  `);
  $('#r_add').onclick = async ()=>{
    const item = { id: crypto.randomUUID(), client:$v('r_client').value.trim(), device:$v('r_device').value.trim(), issue:$v('r_issue').value.trim(), quote:Number($v('r_quote').value||0), status:$v('r_status').value, created:new Date().toISOString() };
    if(!item.client || !item.device) return alert('Client et appareil obligatoires');
    await api('repairs','POST',{ action:'upsert', item });
    route();
  };
  const data = await api('repairs');
  const list = data.items||[];
  const tbody = $('#rtbl tbody');
  const draw = ()=>{
    const q = ($v('r_filter').value||'').toLowerCase();
    const fs = $v('r_filter_status').value;
    tbody.innerHTML='';
    list.filter(x=> (`${x.client} ${x.device} ${x.issue}`).toLowerCase().includes(q) && (!fs || x.status===fs)).forEach(x=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input value="${x.client||''}" data-k="client"></td>
      <td><input value="${x.device||''}" data-k="device"></td>
      <td><input value="${x.issue||''}" data-k="issue"></td>
      <td><input type="number" value="${x.quote||0}" data-k="quote"></td>
      <td>
        <select data-k="status">
          ${['en attente','en cours','terminé','livré','annulé'].map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${new Date(x.created).toLocaleDateString()}</td>
      <td><button class="btn out" data-act="save" data-id="${x.id}">Sauver</button> <button class="btn out" data-act="del" data-id="${x.id}">Supprimer</button></td>`;
      tbody.appendChild(tr);
    });
  };
  draw();
  $v('r_filter').oninput = draw; $v('r_filter_status').onchange = draw;
  tbody.addEventListener('click', async (e)=>{
    const b = e.target.closest('button'); if(!b) return;
    const id = b.dataset.id; const act = b.dataset.act;
    const tr = b.closest('tr'); const inputs = tr.querySelectorAll('input,select');
    const obj = {}; inputs.forEach(inp=> obj[inp.dataset.k]= (inp.type==='number'? Number(inp.value||0): inp.value) );
    if(act==='save'){ await api('repairs','POST',{ action:'upsert', item:{ id, ...obj } }); alert('MAJ OK'); }
    if(act==='del'){ if(confirm('Supprimer ?')){ await api('repairs','POST',{ action:'delete', id }); tr.remove(); } }
  });
}

// -------- Orders (simple stub CRUD) --------
async function renderOrders(){
  const wrap = $('#view');
  wrap.innerHTML = H(`
    <div class="card">
      <div class="grid g3">
        <div><label>Client</label><input id="o_client"></div>
        <div><label>Produit</label><input id="o_item"></div>
        <div><label>Montant (€)</label><input id="o_amount" type="number" min="0"></div>
        <div><label>Date</label><input id="o_date" type="date"></div>
        <div><label>Statut</label>
          <select id="o_status">
            <option value="payé">Payé</option><option value="en attente">En attente</option><option value="remboursé">Remboursé</option>
          </select>
        </div>
        <div style="display:flex;align-items:end"><button class="btn" id="o_add">Ajouter commande</button></div>
      </div>
    </div>
    <div class="card">
      <h3>Commandes</h3>
      <input id="o_filter" placeholder="Filtrer (client/produit)" style="margin-bottom:8px">
      <table id="otbl">
        <thead><tr><th>Client</th><th>Produit</th><th>Montant</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  `);
  $('#o_add').onclick = async ()=>{
    const item = { id: crypto.randomUUID(), client:$v('o_client').value.trim(), item:$v('o_item').value.trim(), amount:Number($v('o_amount').value||0), date:$v('o_date').value || new Date().toISOString().slice(0,10), status:$v('o_status').value };
    if(!item.client || !item.item) return alert('Client et produit requis');
    await api('orders','POST',{ action:'upsert', item }); route();
  };
  const data = await api('orders');
  const list = data.items||[];
  const tbody = $('#otbl tbody');
  const draw = ()=>{
    const q = ($v('o_filter').value||'').toLowerCase();
    tbody.innerHTML='';
    list.filter(x=> (`${x.client} ${x.item}`).toLowerCase().includes(q)).forEach(x=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input value="${x.client||''}" data-k="client"></td>
      <td><input value="${x.item||''}" data-k="item"></td>
      <td><input type="number" value="${x.amount||0}" data-k="amount"></td>
      <td><input type="date" value="${(x.date||'').substring(0,10)}" data-k="date"></td>
      <td>
        <select data-k="status">${['payé','en attente','remboursé'].map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select>
      </td>
      <td><button class="btn out" data-act="save" data-id="${x.id}">Sauver</button> <button class="btn out" data-act="del" data-id="${x.id}">Supprimer</button></td>`;
      tbody.appendChild(tr);
    });
  };
  draw();
  $v('o_filter').oninput = draw;
  tbody.addEventListener('click', async (e)=>{
    const b = e.target.closest('button'); if(!b) return;
    const id = b.dataset.id; const act = b.dataset.act;
    const tr = b.closest('tr'); const inputs = tr.querySelectorAll('input,select');
    const obj = {}; inputs.forEach(inp=> obj[inp.dataset.k]= (inp.type==='number'? Number(inp.value||0): inp.value) );
    if(act==='save'){ await api('orders','POST',{ action:'upsert', item:{ id, ...obj } }); alert('MAJ OK'); }
    if(act==='del'){ if(confirm('Supprimer ?')){ await api('orders','POST',{ action:'delete', id }); tr.remove(); } }
  });
}

// -------- History --------
async function renderHistory(){
  const wrap = $('#view');
  wrap.innerHTML = `<div class="card"><h3>Historique</h3><div id="hist"></div></div>`;
  const data = await api('history');
  const list = (data.items||[]).slice().reverse();
  const box = $('#hist');
  box.innerHTML = list.map(x=>`<div><span class="badge">${new Date(x.at).toLocaleString()}</span> — ${x.event}</div>`).join('') || '<div class="muted">Vide.</div>';
}

// -------- Config --------
async function renderConfig(){
  const wrap = $('#view');
  const cfg = await api('config');
  const def = Object.assign({pro_open_pct:-10, pro_cap_source:'median', currency:'EUR'}, cfg);
  wrap.innerHTML = `
    <div class="card">
      <h3>Configuration</h3>
      <div class="grid g3">
        <div><label>Mode Pro — Ouverture (%)</label><input id="cfg_open" type="number" value="${def.pro_open_pct}"></div>
        <div><label>Plafond basé sur</label>
          <select id="cfg_cap">
            ${['median','max'].map(x=>`<option ${x===def.pro_cap_source?'selected':''} value="${x}">${x}</option>`).join('')}
          </select>
        </div>
        <div><label>Devise</label><input id="cfg_cur" value="${def.currency}"></div>
      </div>
      <div style="margin-top:8px">
        <button class="btn" id="cfg_save">Sauver</button>
      </div>
      <div id="cfg_msg" class="muted small" style="margin-top:8px"></div>
    </div>
  `;
  $('#cfg_save').onclick = async ()=>{
    await api('config','POST',{ action:'set', data:{
      pro_open_pct: Number($('#cfg_open').value||0),
      pro_cap_source: $('#cfg_cap').value,
      currency: $('#cfg_cur').value.trim() || 'EUR'
    }});
    $('#cfg_msg').textContent = 'Config enregistrée.'; setTimeout(()=>$('#cfg_msg').textContent='',1200);
  };
}
