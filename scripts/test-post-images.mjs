import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { testConfig } from "./test-permissions.mjs";

const config = testConfig(process.env);
const origin = process.env.B1E_TEST_APP_ORIGIN;
assert(origin && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin), "Set a loopback B1E_TEST_APP_ORIGIN; never run against production.");
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const service = createClient(config.url, config.serviceKey, options);
const bucket = service.storage.from("post-images");
const users = [], posts = [], paths = [];
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
let stage = "setup", checks = 0, failure;
const must = (result, label) => { assert(!result.error && result.data, label); return result.data; };
const check = (condition, label) => { assert(condition, label); checks++; };
async function api(actor, id, method = "GET", body, mime = "image/png", requestOrigin = origin) {
  const response = await fetch(`${origin}/api/posts/${id}/image`, {
    method, headers: { Cookie: actor?.cookie ?? "", Origin: requestOrigin, "Content-Type": mime }, body, redirect: "error",
  });
  // Vinext dev rejects foreign origins before the route runs; unit tests cover its route headers.
  if (requestOrigin === origin) check(response.headers.get("cache-control") === "private, no-store", "Private no-store response");
  return response;
}
async function post(owner, type = "found") {
  const row = must(await service.from("posts").insert({
    owner_id: owner.id, type, title: "B1e image fixture", category: "other", color: "black",
    description: "Disposable image fixture content", location: "Test", occurred_at: "2026-01-01", moderation: "published",
  }).select().single(), "Create fixture post");
  posts.push(row.id); return row;
}
async function linked(id) {
  return must(await service.from("post_images").select("storage_path").eq("post_id", id), "Read image metadata")[0]?.storage_path ?? null;
}
async function upload(owner, id) {
  const path = `${owner.id}/${id}/${randomUUID()}.png`; paths.push(path);
  must(await bucket.upload(path, png, { contentType: "image/png", upsert: false }), "Upload disposable fixture"); return path;
}
try {
  const settings = must(await service.storage.getBucket("post-images"), "Read private bucket");
  check(!settings.public && settings.file_size_limit === 5242880, "Migration bucket settings");
  for (let n = 0; n < 3; n++) {
    const email = `b1e-${randomUUID()}@example.test`, password = randomBytes(32).toString("base64url");
    const user = must(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "B1e fixture" } }), "Create fixture user").user;
    const actor = { id: user.id, cookie: "", client: null }; users.push(actor);
    const jar = new Map();
    const client = createServerClient(config.url, config.key, { cookies: { getAll: () => [...jar].map(([name,value]) => ({ name,value })), setAll: (items) => items.forEach(({name,value}) => jar.set(name,value)) } });
    must(await client.auth.signInWithPassword({ email,password }), "Sign in fixture");
    actor.cookie = [...jar].map(([k,v]) => `${k}=${v}`).join("; "); actor.client = client;
  }
  const [owner, stranger, admin] = users;
  must(await service.from("profiles").update({role:"admin"}).eq("id",admin.id).select(), "Set fixture admin");
  const target = await post(owner);
  stage = "endpoint auth and validation";
  for (const [actor,status] of [[null,401],[stranger,403],[admin,403]]) {
    check((await api(actor,target.id,"PUT",png)).status === status,"Unauthorized upload");
    check((await api(actor,target.id,"DELETE")).status === status,"Unauthorized delete");
  }
  check((await api(owner,target.id,"PUT",png,"image/png","https://evil.test")).status===403,"Cross-origin rejection");
  for (const [data,mime] of [[png,"image/jpeg"],[Buffer.from("<svg/>"),"image/svg+xml"],[Buffer.alloc(0),"image/png"],[Buffer.alloc(5242881),"image/png"]]) {
    check((await api(owner,target.id,"PUT",data,mime)).status===415,"Invalid file rejected");
  }
  check(await linked(target.id)===null,"No invalid file linked");
  stage = "upload and visibility";
  check((await api(owner,target.id,"PUT",png)).status===200,"Valid upload");
  const path = await linked(target.id); check(!!path,"One linked image"); paths.push(path);
  check(must(await service.from("posts").select("moderation").eq("id",target.id).single(),"Post moderation").moderation==="pending","Upload unpublishes");
  for(const state of ["published","pending","hidden","deleted"]) {
    must(await service.from("posts").update({ moderation: state==="deleted"?"published":state, deleted_at: state==="deleted"?new Date().toISOString():null }).eq("id",target.id).select(),"Set disposable visibility");
    for(const actor of [null,owner,stranger,admin]) {
      const allowed = state!=="deleted" && (state==="published" || actor===owner || actor===admin);
      const response=await api(actor,target.id);
      check(response.status===(allowed?200:404),"Image endpoint visibility");
      if(allowed) check(Buffer.from(await response.arrayBuffer()).equals(png),"Exact image bytes");
      const client = actor?.client ?? createClient(config.url,config.key,options);
      check(!!(await client.storage.from("post-images").download(path)).error,"Direct download denied");
      check(!!(await client.storage.from("post-images").createSignedUrl(path,60)).error,"Direct signing denied");
      check(!!(await client.rpc("set_post_image",{p_actor_id:owner.id,p_post_id:target.id,p_expected_path:path,p_new_path:null})).error,"Client cannot invoke server RPC");
      check(!!(await client.storage.from("post-images").upload(`${owner.id}/${target.id}/${randomUUID()}.png`,png,{contentType:"image/png"})).error,"Direct upload denied");
    }
    const publicResponse=await fetch(`${config.url}/storage/v1/object/public/post-images/${path}`,{redirect:"error"});
    check(!publicResponse.ok,"Old public URL denied");
  }
  stage="replace and delete";
  must(await service.from("posts").update({moderation:"published",deleted_at:null}).eq("id",target.id).select(),"Restore fixture");
  check((await api(owner,target.id,"PUT",png)).status===200,"Replace image");
  const replacement=await linked(target.id); paths.push(replacement);
  check(replacement!==path && !!(await bucket.download(path)).error,"Old file removed only after replace");
  must(await service.from("posts").update({moderation:"published"}).eq("id",target.id).select(),"Publish disposable fixture");
  check((await api(owner,target.id,"DELETE")).status===200,"Delete image");
  check(await linked(target.id)===null && !!(await bucket.download(replacement)).error,"Delete metadata and file");
  check(must(await service.from("posts").select("moderation").eq("id",target.id).single(),"Delete moderation").moderation==="pending","Delete unpublishes");
  check((await api(owner,target.id,"DELETE")).status===200,"Repeated delete");
  const ownAdminPost=await post(admin,"lost");
  check((await api(admin,ownAdminPost.id,"PUT",png)).status===200,"Admin only as actual owner; lost type");
  for(const status of ["verifying","returned","closed"]) {
    must(await service.from("posts").update({status}).eq("id",target.id).select(),"Set terminal fixture");
    check((await api(owner,target.id,"PUT",png)).status===403,"Terminal upload denied");
    check((await api(owner,target.id,"DELETE")).status===403,"Terminal delete denied");
  }
  stage="concurrent locked RPCs";
  for(const operation of ["image","edit","close","accept"]) {
    const p=await post(owner), a=await upload(owner,p.id), b=await upload(owner,p.id);
    let claim;
    if(operation==="accept") claim=must(await service.from("claim_requests").insert({post_id:p.id,requester_id:stranger.id,proof:"Disposable image race proof"}).select().single(),"Create fixture claim");
    const imageCall=()=>service.rpc("set_post_image",{p_actor_id:owner.id,p_post_id:p.id,p_expected_path:null,p_new_path:a});
    const otherCall=()=>operation==="image"?service.rpc("set_post_image",{p_actor_id:owner.id,p_post_id:p.id,p_expected_path:null,p_new_path:b})
      :operation==="edit"?owner.client.rpc("update_post",{p_post_id:p.id,p_content:{title:"Race edited title",category:"other",color:"black",description:"Disposable race edited description",location:"Test",occurredAt:"2026-01-01"}})
      :operation==="close"?owner.client.rpc("close_post",{p_post_id:p.id}):owner.client.rpc("accept_claim",{p_claim_id:claim.id});
    const [first,second]=await Promise.all([imageCall(),otherCall()]);
    const current=must(await service.from("posts").select("status,moderation").eq("id",p.id).single(),"Read race post");
    const actual=await linked(p.id);
    if(operation==="image") check(Number(!first.error)+Number(!second.error)===1 && [a,b].includes(actual),"CAS only one winner");
    if(operation==="accept") check(Number(!first.error)+Number(!second.error)===1 && (first.error?current.status==="verifying"&&!actual:current.moderation==="pending"&&actual===a),"Accept/image serialized");
    if(operation==="close") check(!second.error && current.status==="closed" && (first.error?!actual:actual===a),"Close/image serialized");
    if(operation==="edit") check(!first.error && !second.error && current.moderation==="pending" && actual===a,"Edit/image serialized");
  }
  console.log(`PASS: ${checks} B1e assertions (HTTP endpoint + hosted Auth/Storage/RPC); concurrent API requests, not browser/load proof.`);
} catch (error) {
  failure = new Error(`B1e failed at ${stage}${error.code === "ERR_ASSERTION" ? ` (${error.message})` : ""}; details withheld. Run fixtures: ${posts.join(",")}`);
} finally {
  const errors=[];
  // Discover all endpoint-generated paths too, including partially failed requests.
  for(const id of posts) {
    const metadata=await service.from("post_images").select("storage_path").eq("post_id",id);
    if(metadata.error)errors.push("read metadata");else paths.push(...metadata.data.map(r=>r.storage_path));
    for(const user of users) {
      const list=await bucket.list(`${user.id}/${id}`,{limit:100});
      if(list.error)errors.push("list files");else paths.push(...list.data.map(r=>`${user.id}/${id}/${r.name}`));
    }
  }
  if(paths.length && (await bucket.remove([...new Set(paths)])).error)errors.push("remove files");
  if(posts.length && (await service.from("posts").delete().in("id",posts)).error)errors.push("remove posts");
  for(const user of users) if((await service.auth.admin.deleteUser(user.id)).error)errors.push("remove user");
  for(const table of ["posts","post_images","claim_requests","status_history"]) if(posts.length) {
    const remaining=await service.from(table).select("id").in(table==="posts"?"id":"post_id",posts);
    if(remaining.error||remaining.data.length)errors.push(`${table} readback`);
  }
  for(const user of users) {
    const remaining=await service.from("profiles").select("id").eq("id",user.id);
    if(remaining.error||remaining.data.length||!(await service.auth.admin.getUserById(user.id)).error)errors.push("user readback");
    for(const id of posts) {
      const list=await bucket.list(`${user.id}/${id}`,{limit:100});
      if(list.error||list.data.length)errors.push("files readback");
    }
  }
  assert(!errors.length,`B1e cleanup/readback failed: ${errors.join(",")}`);
  console.log("PASS: B1e fixture metadata/files/posts/claims/history/profiles/Auth cleanup and readback.");
}
if(failure)throw failure;
