const GITHUB_API = 'https://api.github.com';

const ok = (body, status=200)=>({
  statusCode: status,
  headers: { 'Content-Type':'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'*' },
  body: JSON.stringify(body)
});

export async function handler(event){
  try{
    const env = process.env;
    const id = (event.queryStringParameters?.id || '').trim();
    const phone4 = (event.queryStringParameters?.phone || '').replace(/\D/g,'').slice(-4);
    if(!id || !phone4) return ok({error:'missing_params'},400);

    const path = env.GH_PATH_TICKETS || 'data/tickets.json';
    const branch = env.GH_BRANCH || 'main';
    const url = `${GITHUB_API}/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;

    const res = await fetch(url, { headers:{ 'Authorization': `token ${env.GH_TOKEN}`, 'Accept':'application/vnd.github+json', 'User-Agent':'drphonenord-public' }});
    if(!res.ok) return ok({error:'github_'+res.status}, 502);
    const j = await res.json();
    const list = JSON.parse(Buffer.from(j.content||'', 'base64').toString('utf-8') || '[]');

    const t = list.find(x => String(x.code||x.id)===id && String(x.phone||'').replace(/\D/g,'').endsWith(phone4));
    if(!t) return ok({error:'not_found'},404);

    const pub = { id: t.code||t.id, status: t.status||'—', device: t.model||t.device||'—', updated_at: t.updated_at||t.updatedAt||null, note: t.public_note||t.note||null };
    return ok({ticket: pub});
  }catch(e){
    return ok({error:String(e)},500);
  }
}
