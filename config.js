
import { getStore } from "@netlify/blobs";
const ok = (d,s=200)=> new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, x-admin-token","Access-Control-Allow-Methods":"GET, POST, OPTIONS"}});
const err=(s,m)=>ok({error:m},s);
export default async (req)=>{
  if(req.method==="OPTIONS") return ok({ok:true});
  const store = getStore("erp");
  const key="config.json";
  if(req.method==="GET"){
    const json = await store.get(key,{type:"json"}) || { pro_open_pct:-10, pro_cap_source:"median", currency:"EUR" };
    return ok(json);
  }
  if(req.method==="POST"){
    const token = req.headers.get("x-admin-token")||"";
    if(!process.env.ADMIN_TOKEN || token!==process.env.ADMIN_TOKEN) return err(401,"Unauthorized");
    let body; try{ body = await req.json(); }catch{ return err(400,"Invalid JSON"); }
    const db = (await store.get(key,{type:"json"})) || {};
    if(body.action==="set"){
      await store.setJSON(key, { ...db, ...(body.data||{}) });
      return ok({ok:true});
    }
    return err(400,"Unknown action");
  }
  return err(405,"Method Not Allowed");
};
