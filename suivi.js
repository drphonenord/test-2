const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));

const store = {
  token: localStorage.getItem('ADMIN_TOKEN')||'',
  tickets: [],
};

const api = {
  async getAll(){
    const r = await fetch('/.netlify/functions/get-blob?ns=tickets&key=all', { headers:{ 'x-admin-token': store.token }});
    if(!r.ok) throw new Error('GET '+r.status);
    const j = await r.json();
    store.tickets = Array.isArray(j.data) ? j.data : [];
    return store.tickets;
  },
  async saveAll(){
    const r = await fetch('/.netlify/functions/set-blob', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'x-admin-token': store.token },
      body: JSON.stringify({ ns:'tickets', key:'all', data: store.tickets })
    });
    if(!r.ok) throw new Error('SET '+r.status);
    return r.json();
  }
};

function toast(txt){ $('#msg').textContent = txt; setTimeout(()=>$('#msg').textContent='', 2500); }

function genCode(){
  const yy = new Date().getFullYear();
  const n = String(Math.floor(Math.random()*900)+100).padStart(3,'0');
  return `DRP-${yy}-${n}`;
}

function renderList(list){
  if(!list.length){ $('#results').innerHTML = '—'; return; }
  const rows = list.slice(0,100).map(t=>`<div><b>${t.code||t.id}</b> — ${t.status||'—'} — ${t.model||'—'} ${t.client?(' · '+t.client):''}</div>`).join('');
  $('#results').innerHTML = rows;
}

function pickByCode(code){
  code = (code||'').trim();
  return store.tickets.find(t => String(t.code||t.id).toLowerCase() === code.toLowerCase());
}

function setForm(t={}){
  $('#f_code').value = t.code||t.id||'';
  $('#f_status').value = t.status||'Réceptionné';
  $('#f_model').value = t.model||'';
  $('#f_client').value = t.client||'';
  $('#f_note').value = t.public_note||t.note||'';
}

function getForm(){
  let code = $('#f_code').value.trim();
  if(!code) code = genCode();
  return {
    code,
    id: code,
    status: $('#f_status').value,
    model: $('#f_model').value.trim(),
    client: $('#f_client').value.trim(),
    public_note: $('#f_note').value.trim(),
    updated_at: new Date().toISOString()
  };
}

async function init(){
  $('#adm_token').value = store.token;
  $('#btnSaveToken').onclick = ()=>{ store.token = $('#adm_token').value.trim(); localStorage.setItem('ADMIN_TOKEN', store.token); toast('Clé enregistrée'); };

  // Core buttons
  $('#btnLoad').onclick = async ()=>{
    try{
      await api.getAll();
      const code = $('#load_code').value.trim();
      const t = pickByCode(code);
      if(!t) return toast('Ticket introuvable');
      setForm(t);
      toast('Chargé');
    }catch(e){ toast('Erreur de chargement'); }
  };

  $('#btnOpen').onclick = async ()=>{
    try{
      await api.getAll();
      const list = store.tickets.filter(t => (t.status||'').toLowerCase() !== 'livré' && (t.status||'').toLowerCase() !== 'termine' && (t.status||'').toLowerCase() !== 'terminé');
      renderList(list);
      toast(list.length+' ouverts');
    }catch(e){ toast('Erreur'); }
  };

  $('#btnLast').onclick = async ()=>{
    try{
      await api.getAll();
      const list = store.tickets.slice(-100).reverse();
      renderList(list);
      toast('Derniers (100)');
    }catch(e){ toast('Erreur'); }
  };

  $('#btnSearch').onclick = async ()=>{
    try{
      await api.getAll();
      const q = $('#q').value.trim().toLowerCase();
      const only = $('#onlyOpen').checked;
      let list = store.tickets.filter(t=>{
        const hay = [t.code||t.id, t.model, t.client, t.status].join(' ').toLowerCase();
        return hay.includes(q);
      });
      if(only) list = list.filter(t => !['livré','termine','terminé'].includes((t.status||'').toLowerCase()));
      renderList(list);
      toast(list.length+' résultat(s)');
    }catch(e){ toast('Erreur'); }
  };

  $('#btnSave').onclick = async ()=>{
    const data = getForm();
    try{
      await api.getAll();
      const i = store.tickets.findIndex(t => String(t.code||t.id) === String(data.code));
      if(i>=0) store.tickets[i] = { ...store.tickets[i], ...data };
      else store.tickets.push(data);
      await api.saveAll();
      setForm(data);
      toast('Enregistré ✔');
    }catch(e){ toast('Erreur d\\'enregistrement'); }
  };

  $('#btnNewCode').onclick = ()=>{
    const keepClient = $('#f_client').value;
    const keepModel = $('#f_model').value;
    setForm({ code: genCode(), client: keepClient, model: keepModel, status: 'Réceptionné', public_note: '' });
    toast('Nouveau code généré');
  };

  $('#btnLink').onclick = ()=>{
    const code = $('#f_code').value.trim();
    if(!code) return toast('Pas de code');
    // Lien public: /suivi.html → nécessite les 4 derniers chiffres du tel côté client, donc on affiche juste l'URL base
    const url = `${location.origin}/suivi.html`;
    navigator.clipboard.writeText(url).then(()=>toast('Lien copié: '+url)).catch(()=>toast('Lien: '+url));
  };

  $('#btnPrint').onclick = ()=>{
    const code = $('#f_code').value.trim();
    const model = $('#f_model').value.trim();
    const client = $('#f_client').value.trim();
    const status = $('#f_status').value;
    const note = $('#f_note').value.trim();
    const win = window.open('', '_blank');
    win.document.write(`<pre>DR PHONE — FICHE REPARATION
Code: ${code}
Client: ${client}
Modèle: ${model}
Statut: ${status}
Note: ${note}
Date: ${new Date().toLocaleString()}</pre>`);
    win.document.close();
    win.print();
  };
}

document.addEventListener('DOMContentLoaded', init);
