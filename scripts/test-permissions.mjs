import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export function testConfig(env) {
  const ref = env.SUPABASE_TEST_PROJECT_REF;
  assert(ref && /^[a-z0-9]{20}$/.test(ref), "Set SUPABASE_TEST_PROJECT_REF to the dedicated test project ref.");
  assert(env.SUPABASE_TEST_URL === `https://${ref}.supabase.co`, "Test URL must exactly match the dedicated project ref.");
  assert(env.SUPABASE_TEST_ANON_KEY && env.SUPABASE_TEST_SERVICE_ROLE_KEY, "Set test-only public and service-role keys outside Git.");
  assert(env.SUPABASE_TEST_ANON_KEY !== env.SUPABASE_TEST_SERVICE_ROLE_KEY, "Public and service-role keys must differ.");
  return { url: env.SUPABASE_TEST_URL, key: env.SUPABASE_TEST_ANON_KEY, serviceKey: env.SUPABASE_TEST_SERVICE_ROLE_KEY };
}

export function assertDenied(response, body, operation) {
  // RLS may return 200 with zero affected rows for UPDATE/DELETE.
  const empty = operation !== "POST" && response.ok && Array.isArray(body) && body.length === 0;
  assert(empty || [401, 403].includes(response.status), "Expected permission denial or zero affected rows.");
}

export function assertStorageDenied(response, body, operation) {
  if (!response.ok && [401, 403].includes(Number(body?.statusCode))) return;
  assertDenied(response, body, operation);
}

export async function runPermissionTests(env = process.env) {
  const config = testConfig(env);
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const service = createClient(config.url, config.serviceKey, options);
  const run = randomUUID();
  const users = [];
  const tables = ["profiles", "posts", "post_images", "claim_requests", "status_history", "moderation_actions"];
  const ids = Object.fromEntries(tables.map((table) => [table, [randomUUID(), randomUUID()]]));
  const objectPaths = [];
  let checks = 0;
  let failure;
  const cleanupErrors = [];
  let stage = "provision users";
  const requireResult = (result, label) => {
    assert(!result.error && result.data, label);
    return result.data;
  };
  const snapshot = async () => Object.fromEntries(await Promise.all(tables.map(async (table) => [table,
    requireResult(await service.from(table).select("*").in("id", ids[table]).order("id"), `Read fixture ${table}`),
  ])));
  const request = async (token, table, method, payload, id) => {
    const headers = { apikey: config.key, "Content-Type": "application/json", Prefer: "return=representation" };
    if (token || config.key.split(".").length === 3) headers.Authorization = `Bearer ${token || config.key}`;
    const response = await fetch(`${config.url}/rest/v1/${table}${id ? `?id=eq.${id}` : ""}`, {
      method, headers, body: payload ? JSON.stringify(payload) : undefined, redirect: "error",
    });
    const body = await response.json();
    // Record server-generated IDs even when an attack unexpectedly succeeds.
    if (table === "posts" && method === "POST" && response.ok && Array.isArray(body)) {
      for (const row of body) if (typeof row.id === "string" && !ids.posts.includes(row.id)) ids.posts.push(row.id);
    }
    return { response, body };
  };
  try {
    // Admin-created fake users test Auth/trigger/RLS, not email delivery or PKCE.
    for (const index of [0, 1, 2]) {
      const email = `a2-${run}-${index}@example.test`;
      const password = randomBytes(32).toString("base64url");
      const result = requireResult(await service.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name: `A2 fixture ${index}`, role: "admin" },
      }), "Create fixture user");
      assert(result.user, "Auth returned no fixture user");
      users.push({ id: result.user.id, token: "" });
      ids.profiles = [...users.map((user) => user.id), ids.profiles.at(-1)];
      const profile = requireResult(await service.from("profiles").select("*").eq("id", result.user.id).single(), "Profile trigger");
      assert.equal(profile.role, "user", "Metadata must not grant admin");
      assert.equal(profile.full_name, `A2 fixture ${index}`, "Profile trigger name");
      const client = createClient(config.url, config.key, options);
      const signedIn = requireResult(await client.auth.signInWithPassword({ email, password }), "Sign in fixture");
      assert(signedIn.session?.access_token, "Missing fixture session");
      assert.equal(signedIn.user?.id, users[index].id, "Fixture login identity");
      users[index].token = signedIn.session.access_token;
      const after = requireResult(await service.from("profiles").select("*").eq("id", result.user.id).single(), "Read profile after login");
      assert.deepEqual(after, profile, "Login must preserve profile");
      checks += 3;
    }
    const [member, stranger, admin] = users;
    requireResult(await service.from("profiles").update({ role: "admin" }).eq("id", admin.id).select().single(), "Assign fixture admin through trusted API");
    const posts = ids.posts.map((id) => ({
      id, owner_id: member.id, type: "found", title: `A2 ${run}`, category: "other", color: "black",
      description: "Disposable A2 fixture", location: "Test", occurred_at: "2026-01-01", status: "searching", moderation: "published",
    }));
    const rows = {
      posts: [posts[0]],
      post_images: [{ id: ids.post_images[0], post_id: posts[0].id, storage_path: `${member.id}/a2-${run}/seed.txt`, alt_text: "A2 fixture" }],
      claim_requests: [{ id: ids.claim_requests[0], post_id: posts[0].id, requester_id: stranger.id, proof: "Disposable fake proof", status: "pending" }],
      status_history: [{ id: ids.status_history[0], post_id: posts[0].id, from_status: null, to_status: "searching", actor_id: member.id, note: "A2 fixture" }],
      moderation_actions: [{ id: ids.moderation_actions[0], post_id: posts[0].id, admin_id: admin.id, action: "restore", reason: "A2 fixture" }],
    };
    stage = "seed fixture rows";
    for (const table of tables.slice(1)) requireResult(await service.from(table).insert(rows[table]).select(), `Seed ${table}`);
    const seedPath = rows.post_images[0].storage_path;
    objectPaths.push(seedPath, `${member.id}/a2-${run}/attack.txt`);
    requireResult(await service.storage.from("post-images").upload(seedPath, "A2 original", { contentType: "text/plain" }), "Seed storage object");

    const actors = [{ name: "guest", token: "", id: member.id },
      { name: "member", ...member }, { name: "stranger", ...stranger }, { name: "admin", ...admin }];
    for (const actor of actors) {
      console.log(`Checking ${actor.name}: profile, REST and Storage permissions...`);
      stage = `${actor.name}: read and profile checks`;
      const read = await request(actor.token, "posts", "GET", null, posts[0].id);
      assert(read.response.ok && read.body.length === 1, "Published post remains readable");
      checks++;
      if (actor.token) {
        const original = requireResult(await service.from("profiles").select("*").eq("id", actor.id).single(), "Read own fixture");
        const input = { full_name: `Edited ${actor.name}`, faculty: null };
        const changed = await request(actor.token, "profiles", "PATCH", input, actor.id);
        assert(changed.response.ok && changed.body.length === 1 && changed.body[0].id === actor.id, "Own profile update must return one row");
        const saved = requireResult(await service.from("profiles").select("*").eq("id", actor.id).single(), "Read saved fixture");
        assert.deepEqual(saved, { ...original, ...input }, "Only editable fields change");
        requireResult(await service.from("profiles").update({ full_name: original.full_name, faculty: original.faculty }).eq("id", actor.id).select(), "Restore own fixture");
        checks++;
      }
      stage = `${actor.name}: A3a create found post`;
      const valid = { owner_id: actor.id, type: "found", title: "Found fixture", category: "other", color: "black",
        description: "Disposable found post fixture", location: "Test", occurred_at: "2026-01-01" };
      const created = await request(actor.token, "posts", "POST", valid);
      if (!actor.token) {
        assertDenied(created.response, created.body, "POST"); checks++;
      } else {
        assert(created.response.ok && created.body.length === 1, "Own found insert must succeed");
        const post = created.body[0];
        assert.equal(post.owner_id, actor.id);
        assert.equal(post.status, "searching"); assert.equal(post.moderation, "pending");
        assert.equal(post.deleted_at, null); checks++;
        const own = await request(actor.token, "posts", "GET", null, post.id);
        assert(own.response.ok && own.body.length === 1, "Owner reads pending post"); checks++;
        const outsider = await request(actor.id === member.id ? stranger.token : member.token, "posts", "GET", null, post.id);
        assert(outsider.response.ok && outsider.body.length === 0, "Stranger cannot read pending post"); checks++;
        const guest = await request("", "posts", "GET", null, post.id);
        assert(guest.response.ok && guest.body.length === 0, "Guest cannot read pending post"); checks++;
        for (const change of [{ owner_id: actor.id === member.id ? stranger.id : member.id }, { type: "lost" },
          { moderation: "published" }, { status: "returned" }, { id: ids.posts[1] },
          { created_at: "2000-01-01T00:00:00Z" }, { updated_at: "2000-01-01T00:00:00Z" }, { deleted_at: null }]) {
          const attack = await request(actor.token, "posts", "POST", { ...valid, ...change });
          assertDenied(attack.response, attack.body, "POST"); checks++;
        }
        for (const change of [{ title: "a" }, { title: "a".repeat(101) }, { title: "    " },
          { category: "" }, { color: "a".repeat(41) }, { description: "short" },
          { description: "a".repeat(1001) }, { location: "a" }, { location: "a".repeat(121) },
          { occurred_at: "2026-02-30" }]) {
          const attack = await request(actor.token, "posts", "POST", { ...valid, ...change });
          assert(attack.response.status === 400 && ["23514", "22008", "22007"].includes(attack.body.code), "Invalid content must fail validation"); checks++;
        }
      }
      const baseline = await snapshot();
      const attacks = [
        ["PATCH", { role: "admin" }, actor.id],
        ["PATCH", { id: ids.profiles.at(-1) }, actor.id],
        ["PATCH", { created_at: "2000-01-01T00:00:00Z" }, actor.id],
        ["PATCH", { full_name: "Other account" }, actor.id === member.id ? stranger.id : member.id],
        ["POST", { id: ids.profiles.at(-1), full_name: "Injected", role: "admin" }, null],
        ["DELETE", null, actor.id],
      ];
      if (!actor.token) attacks.push(["PATCH", { full_name: "Guest edit" }, member.id]);
      for (const [method, payload, id] of attacks) {
        const result = await request(actor.token, "profiles", method, payload, id);
        assertDenied(result.response, result.body, method);
        assert.deepEqual(await snapshot(), baseline, "Forbidden profile request changed data");
        checks++;
      }
      for (const table of tables.slice(1)) {
        stage = `${actor.name}: blocked ${table} writes`;
        const inserted = { ...rows[table][0], id: ids[table][1] };
        if (table === "claim_requests") inserted.requester_id = member.id;
        const patch = table === "posts" ? { moderation: "hidden", status: "returned", owner_id: stranger.id }
          : table === "claim_requests" ? { proof: "Changed", status: "accepted", requester_id: member.id }
          : table === "post_images" ? { alt_text: "Changed" }
          : table === "status_history" ? { note: "Changed" } : { reason: "Changed" };
        for (const [method, payload, id] of [["POST", inserted, null], ["PATCH", patch, ids[table][0]], ["DELETE", null, ids[table][0]]]) {
          const result = await request(actor.token, table, method, payload, id);
          assertDenied(result.response, result.body, method);
          assert.deepEqual(await snapshot(), baseline, `Forbidden ${table} request changed data`);
          checks++;
        }
      }
      stage = `${actor.name}: blocked storage writes`;
      const headers = { apikey: config.key, "Content-Type": "text/plain" };
      if (actor.token || config.key.split(".").length === 3) headers.Authorization = `Bearer ${actor.token || config.key}`;
      for (const [method, path] of [["POST", objectPaths[1]], ["PUT", seedPath], ["DELETE", seedPath]]) {
        const result = await fetch(`${config.url}/storage/v1/object/post-images${method === "DELETE" ? "" : `/${path}`}`, {
          method, headers: { ...headers, "Content-Type": method === "DELETE" ? "application/json" : "text/plain" },
          body: method === "DELETE" ? JSON.stringify({ prefixes: [path] }) : "Injected", redirect: "error",
        });
        const body = await result.json();
        assertStorageDenied(result, body, method);
        const blob = requireResult(await service.storage.from("post-images").download(seedPath), "Original storage object remains");
        assert.equal(await blob.text(), "A2 original", "Storage object changed");
        const list = requireResult(await service.storage.from("post-images").list(`${member.id}/a2-${run}`), "List fixture storage");
        assert.deepEqual(list.map((item) => item.name), ["seed.txt"], "Unexpected uploaded object");
        checks++;
      }
    }
  } catch {
    failure = new Error(`Permission checks failed at: ${stage}. Details withheld to keep credentials and personal data out of logs.`);
  } finally {
    // Delete only IDs and paths allocated by this invocation, including failed attack inserts.
    if (objectPaths.length) {
      try { if ((await service.storage.from("post-images").remove(objectPaths)).error) cleanupErrors.push("storage"); }
      catch { cleanupErrors.push("storage"); }
    }
    for (const table of [...tables].reverse()) {
      if (table === "profiles") continue;
      try { if ((await service.from(table).delete().in("id", ids[table])).error) cleanupErrors.push(table); }
      catch { cleanupErrors.push(table); }
    }
    if (users.length) {
      try { if ((await service.from("profiles").delete().eq("id", ids.profiles.at(-1))).error) cleanupErrors.push("injected profile"); }
      catch { cleanupErrors.push("injected profile"); }
    }
    for (const user of users) {
      try { if ((await service.auth.admin.deleteUser(user.id)).error) cleanupErrors.push("fixture user"); }
      catch { cleanupErrors.push("fixture user"); }
    }
  }
  assert(!cleanupErrors.length, `Fixture cleanup failed: ${cleanupErrors.join(", ")}; run ${run}. Do not enable profile editing.`);
  if (failure) throw failure;
  console.log(`PASS: ${checks} Auth/trigger/REST/Storage checks; fixtures removed. Email delivery and PKCE still require browser verification.`);
  return checks;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await runPermissionTests(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
