
import { getStore } from "@netlify/blobs";
const ok = (d,s=200)=> new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, x-admin-token","Access-Control-Allow-Methods":"GET, POST, OPTIONS"}});
const err=(s,m)=>ok({error:m},s);
export default async (req)=>{
  if(req.method==="OPTIONS") return ok({ok:true});
  const store = getStore("erp");
  const key="history.json";
  if(req.method==="GET"){
    const json = await store.get(key,{type:"json"}) || { items: [] };
    return ok(json);
  }
  if(req.method==="POST"){
    const token = req.headers.get("x-admin-token")||"";
    if(!process.env.ADMIN_TOKEN || token!==process.env.ADMIN_TOKEN) return err(401,"Unauthorized");
    let body; try{ body = await req.json(); }catch{ return err(400,"Invalid JSON"); }
    const db = (await store.get(key,{type:"json"})) || { items: [] };
    const evt = { at: new Date().toISOString(), event: String(body.event||"") };
    db.items.push(evt);
    await store.setJSON(key, db);
    return ok({ok:true});
  }
  return err(405,"Method Not Allowed");
};
