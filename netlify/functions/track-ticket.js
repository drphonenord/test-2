import { getStore } from '@netlify/blobs';

const ok = (body, status=200)=>({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  },
  body: JSON.stringify(body)
});

export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return ok({ok:true});
  let params = {};
  if (event.httpMethod === 'GET') params = event.queryStringParameters || {};
  else { try{ params = JSON.parse(event.body||'{}'); } catch { params = {}; } }

  const id = (params.id||'').trim();
  const phone = (params.phone||'').replace(/\D/g,''); // chiffres
  if(!id || phone.length < 4) return ok({error:'missing_params'}, 400);

  try{
    const store = getStore('tickets');
    const list = await store.get('all', { type: 'json' }) || [];
    const match = list.find(t => String(t.id)===id && (String(t.phone||'').replace(/\D/g,'').endsWith(phone.slice(-4))));
    if(!match) return ok({error:'not_found'}, 404);

    const pub = {
      id: match.id,
      status: match.status || 'En cours',
      device: match.device || match.model || '—',
      updated_at: match.updated_at || match.updatedAt || null,
      note: match.public_note || null
    };
    return ok({ticket: pub});
  }catch(e){
    return ok({error:String(e)}, 500);
  }
}
