
import { getStore } from "@netlify/blobs";

const ok = (data, status=200) => new Response(JSON.stringify(data), {
  status, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, x-admin-token","Access-Control-Allow-Methods":"GET, POST, OPTIONS"} });
const err = (s,m)=> ok({error:m}, s);

export default async (req)=>{
  if(req.method==="OPTIONS") return ok({ok:true});
  const store = getStore("erp");
  const key="orders.json";
  if(req.method==="GET"){
    const json = await store.get(key, {type:"json"}) || { items: [] };
    return ok(json);
  }
  if(req.method==="POST"){
    const token = req.headers.get("x-admin-token")||"";
    if(!process.env.ADMIN_TOKEN || token!==process.env.ADMIN_TOKEN) return err(401,"Unauthorized");
    let body; try{ body = await req.json(); }catch{ return err(400,"Invalid JSON"); }
    const db = (await store.get(key, {type:"json"})) || { items: [] };
    if(body.action==="upsert"){ // add or update by id
      const it = body.item || {};
      const id = it.id;
      if(!id) return err(400,"Missing id");
      const idx = (db.items||[]).findIndex(x=>x.id===id);
      if(idx>=0) db.items[idx] = { ...db.items[idx], ...it }; else (db.items||[]).push(it);
      await store.setJSON(key, db);
      return ok({ok:true});
    }
    if(body.action==="delete" && true){
      const id = body.id;
      if(!id) return err(400,"Missing id");
      const items = (db.items||[]).filter(x=>x.id!==id);
      await store.setJSON(key, { items });
      return ok({ok:true});
    }
    if(body.action==="set"){ // full replace or config set
      const data = body.data ?? body;
      await store.setJSON(key, data);
      return ok({ok:true});
    }
    return err(400,"Unknown action");
  }
  return err(405,"Method Not Allowed");
};
