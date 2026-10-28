// Local browser fixture bridge. Run only with the dedicated test env; stop with Ctrl+C to clean up.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { testConfig } from "./test-permissions.mjs";

const config = testConfig(process.env);
assert.equal(process.env.SUPABASE_TEST_PROJECT_REF, "lsaukzzmwbsztnlcrdpk", "Only the named UniLost test project is allowed.");
const upstream = process.env.B1F_APP_ORIGIN;
assert(upstream && /^http:\/\/localhost:\d+$/.test(upstream), "Set B1F_APP_ORIGIN to the local test app.");
const port = Number(process.env.B1F_FIXTURE_PORT || 5195);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535 && new URL(upstream).port !== String(port));
const out = process.env.B1F_OUTPUT;
assert(out, "Set B1F_OUTPUT to a local evidence directory.");
await mkdir(out, { recursive: true });
await mkdir(`${out}/inputs`, { recursive: true });
for (const name of ["red.png", "blue.png", "valid.jpg", "valid.webp"]) {
  await writeFile(`${out}/inputs/${name}`, await readFile(new URL(`../tests/fixtures/post-images/${name}`, import.meta.url)));
}
await writeFile(`${out}/inputs/invalid.txt`, "Not an image");
await writeFile(`${out}/inputs/empty.png`, Buffer.alloc(0));
await writeFile(`${out}/inputs/large.png`, Buffer.alloc(5242881));
const service = createClient(config.url, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const actors = new Map(), postIds = [], allPaths = new Set(), requests = [];
const controlKey = randomBytes(24).toString("hex");
const must = (result, label) => { assert(!result.error && result.data, label); return result.data; };
let dropNext = false, delayNext = false, stopping = false;
let server;

async function cleanup() {
  if (stopping) return;
  stopping = true;
  const failures = [];
  try {
    const created = must(await service.from("posts").select("id").in("owner_id", [...actors.values()].map(actor => actor.id)), "Find all disposable actor posts");
    created.forEach(row => { if (!postIds.includes(row.id)) postIds.push(row.id); });
    const rows = must(await service.from("post_images").select("storage_path").in("post_id", postIds), "Read cleanup images");
    rows.forEach(row => allPaths.add(row.storage_path));
    if (allPaths.size) {
      must(await service.storage.from("post-images").remove([...allPaths]), "Remove fixture objects");
      for (const path of allPaths) assert((await service.storage.from("post-images").download(path)).error, "Fixture object still readable");
    }
    must(await service.from("posts").delete().in("id", postIds).select(), "Delete fixture posts");
    for (const table of ["posts", "post_images", "claim_requests", "status_history"]) {
      const column = table === "posts" ? "id" : "post_id";
      assert.equal(must(await service.from(table).select("id").in(column, postIds), `Readback ${table}`).length, 0);
    }
  } catch (error) { failures.push(error.message); }
  for (const actor of actors.values()) {
    const deleted = await service.auth.admin.deleteUser(actor.id);
    if (deleted.error && deleted.error.status !== 404) failures.push("Delete fixture user");
    if (!(await service.auth.admin.getUserById(actor.id)).error) failures.push("Fixture Auth readback");
    if (must(await service.from("profiles").select("id").eq("id", actor.id), "Profile readback").length) failures.push("Fixture profile remains");
  }
  await writeFile(`${out}/fixture-summary.json`, JSON.stringify({ project: process.env.SUPABASE_TEST_PROJECT_REF, posts: postIds, requests, cleanup: failures.length ? "FAIL" : "PASS", failures }, null, 2));
  console.log(`Fixture cleanup ${failures.length ? "FAIL" : "PASS"}`);
  server?.close();
  process.exitCode = failures.length ? 1 : 0;
}

try {
  for (const role of ["owner", "stranger", "admin", "expired"]) {
    const email = `b1f-${randomUUID()}@example.test`, password = randomBytes(32).toString("base64url");
    const user = must(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `B1f ${role}` } }), "Create fixture user").user;
    const actor = { id: user.id, cookies: [] };
    actors.set(role, actor);
    const client = createServerClient(config.url, config.key, { cookies: { getAll: () => actor.cookies, setAll: items => { actor.cookies = items; } } });
    must(await client.auth.signInWithPassword({ email, password }), "Sign in fixture");
    if (role === "admin") must(await service.from("profiles").update({ role: "admin" }).eq("id", user.id).select(), "Fixture admin");
  }
  const fixtures = {};
  for (const [name, type, status, moderation, owner] of [
    ["found", "found", "searching", "published", "owner"], ["lost", "lost", "matched", "hidden", "owner"],
    ["terminal", "found", "closed", "published", "owner"], ["expiry", "lost", "searching", "pending", "expired"],
  ]) {
    const id = randomUUID(); postIds.push(id); fixtures[name] = id;
    must(await service.from("posts").insert({ id, owner_id: actors.get(owner).id, type, status, moderation, title: `B1f ${name} fixture`, category: "other", color: "Đỏ", description: "Dữ liệu giả kiểm thử giao diện ảnh.", location: "Thư viện", occurred_at: "2026-10-24" }).select(), "Create fixture post");
  }
  await writeFile(`${out}/fixture-control.json`, JSON.stringify({ controlKey, fixtures, origin: `http://localhost:${port}` }));
  server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    try {
      if (url.pathname === "/__fixture/login") {
        const actor = actors.get(url.searchParams.get("actor"));
        const names = new Set([...actors.values()].flatMap(value => value.cookies.map(cookie => cookie.name)));
        const cookies = [...names].map(name => `${name}=; Path=/; Max-Age=0; SameSite=Lax`);
        actor?.cookies.forEach(cookie => cookies.push(`${cookie.name}=${cookie.value}; Path=/; SameSite=Lax; HttpOnly`));
        res.writeHead(303, { "Set-Cookie": cookies, Location: "/posts/new", "Cache-Control": "no-store" }); res.end(); return;
      }
      if (url.pathname === "/__fixture/control") {
        assert.equal(req.headers["x-fixture-control"], controlKey, "Fixture control authorization");
        const body = []; for await (const chunk of req) body.push(chunk);
        const command = JSON.parse(Buffer.concat(body).toString() || "{}");
        if (command.operation === "drop-next") dropNext = true;
        if (command.operation === "delay-next") delayNext = true;
        if (command.operation === "expire") must(await service.auth.admin.updateUserById(actors.get("expired").id, { ban_duration: "24h" }), "Revoke disposable fixture user access");
        if (command.operation === "publish") {
          assert(postIds.includes(command.id));
          must(await service.from("posts").update({ moderation: "published" }).eq("id", command.id).select(), "Publish fixture");
        }
        if (command.operation === "register-created") {
          const row = must(await service.from("posts").select("id,owner_id,title").eq("id", command.id).single(), "Check created fixture");
          assert.equal(row.owner_id, actors.get("owner").id); assert(row.title.startsWith("B1f "));
          if (!postIds.includes(row.id)) postIds.push(row.id);
        }
        const images = must(await service.from("post_images").select("post_id,storage_path").in("post_id", postIds), "Read images");
        images.forEach(row => allPaths.add(row.storage_path));
        const posts = must(await service.from("posts").select("id,status,moderation").in("id", postIds), "Read posts");
        res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        res.end(JSON.stringify({ posts, images, requests }));
        if (command.operation === "cleanup") await cleanup();
        return;
      }
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const headers = { ...req.headers, host: new URL(upstream).host };
      if (headers.origin === `http://localhost:${port}`) headers.origin = upstream;
      delete headers.connection; delete headers["content-length"];
      const mutation = /^\/api\/posts\/[^/]+\/image$/.test(url.pathname) && ["PUT", "DELETE"].includes(req.method);
      const drop = mutation && dropNext, delay = mutation && delayNext;
      if (mutation) { dropNext = false; delayNext = false; }
      const response = await fetch(`${upstream}${url.pathname}${url.search}`, { method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body, redirect: "manual" });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (mutation) {
        requests.push({ method: req.method, path: url.pathname, status: response.status, dropped: drop });
        const id = url.pathname.split("/")[3];
        if (postIds.includes(id)) must(await service.from("post_images").select("storage_path").eq("post_id", id), "Track image").forEach(row => allPaths.add(row.storage_path));
      }
      if (drop || delay) await new Promise(resolve => setTimeout(resolve, 1800));
      if (drop) {
        // Send headers first: a bare disconnect lets Chromium transparently retry an idempotent PUT.
        res.writeHead(response.status, { "Content-Type": "application/json", "Content-Length": bytes.length + 20, "Cache-Control": "no-store" });
        res.write("{");
        setTimeout(() => res.destroy(), 150);
        return;
      }
      const outgoing = Object.fromEntries(response.headers);
      if (response.headers.getSetCookie().length) outgoing["set-cookie"] = response.headers.getSetCookie();
      delete outgoing["content-encoding"]; delete outgoing["content-length"]; delete outgoing["transfer-encoding"];
      if (outgoing.location?.startsWith(upstream)) outgoing.location = outgoing.location.replace(upstream, `http://localhost:${port}`);
      res.writeHead(response.status, outgoing); res.end(bytes);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain" }); res.end("Fixture bridge failed; see test stage.");
    }
  });
  await new Promise(resolve => server.listen(port, "localhost", resolve));
  console.log(`Fixture bridge ready: http://localhost:${port}; dedicated test project only. Control details are local, excluded from handoff.`);
  process.on("SIGINT", () => void cleanup());
  process.on("SIGTERM", () => void cleanup());
} catch (error) { console.error(error.message); await cleanup(); process.exitCode = 1; }
