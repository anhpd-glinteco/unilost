import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
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
  const request = async (token, table, method, payload, id, query = "") => {
    const headers = { apikey: config.key, "Content-Type": "application/json", Prefer: "return=representation" };
    if (token || config.key.split(".").length === 3) headers.Authorization = `Bearer ${token || config.key}`;
    const response = await fetch(`${config.url}/rest/v1/${table}?${id ? `id=eq.${id}&` : ""}${query}`, {
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
    for (const index of [0, 1, 2, 3]) {
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
    const [member, stranger, admin, outsider] = users;
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
    stage = "A3b read visibility";
    for (const state of ["published", "pending", "hidden", "deleted"]) {
      requireResult(await service.from("posts").update({
        moderation: state === "deleted" ? "published" : state,
        deleted_at: state === "deleted" ? "2026-01-02T00:00:00Z" : null,
      }).eq("id", posts[0].id).select(), "Set disposable post visibility");
      for (const actor of actors) {
        const read = await request(actor.token, "posts", "GET", null, posts[0].id);
        const privileged = !!actor.token && [member.id, admin.id].includes(actor.id);
        // Deleted rows remain readable to owner/admin in DB; the detail query excludes them.
        assert(read.response.ok && read.body.length === (state === "published" || privileged ? 1 : 0), `Unexpected ${state} visibility for ${actor.name}`);
        const headers = { apikey: config.key };
        if (actor.token || config.key.split(".").length === 3) headers.Authorization = `Bearer ${actor.token || config.key}`;
        const detail = await fetch(`${config.url}/rest/v1/posts?id=eq.${posts[0].id}&deleted_at=is.null&select=id`, { headers, redirect: "error" });
        const body = await detail.json();
        assert(detail.ok && body.length === (state !== "deleted" && (state === "published" || privileged) ? 1 : 0), `Unexpected detail visibility for ${actor.name}`);
        checks += 2;
      }
    }
    requireResult(await service.from("posts").update({ moderation: "published", deleted_at: null }).eq("id", posts[0].id).select(), "Restore disposable post");
    stage = "A5 seed second claim";
    const otherClaim = { id: randomUUID(), post_id: posts[0].id, requester_id: admin.id,
      proof: "Another disposable fake proof", status: "pending" };
    ids.claim_requests.push(otherClaim.id);
    requireResult(await service.from("claim_requests").insert(otherClaim).select(), "Seed second disposable claim");
    const claimActors = [{ name: "guest", token: "", id: null }, { name: "owner", ...member },
      { name: "requester", ...stranger }, { name: "stranger", ...outsider }, { name: "admin", ...admin }];
    for (const state of ["published", "pending", "hidden", "deleted", "closed"]) {
      stage = `A5 ${state}: set fixture visibility`;
      requireResult(await service.from("posts").update({
        moderation: ["pending", "hidden"].includes(state) ? state : "published",
        deleted_at: state === "deleted" ? "2026-01-02T00:00:00Z" : null,
        status: state === "closed" ? "closed" : "searching",
      }).eq("id", posts[0].id).select(), "Set claim fixture visibility");
      for (const actor of claimActors) {
        stage = `A5 ${state}: ${actor.name} claim reads`;
        const privileged = [member.id, admin.id].includes(actor.id);
        const expected = privileged ? [rows.claim_requests[0], otherClaim]
          : actor.id === stranger.id ? rows.claim_requests : [];
        const assertClaims = (actual, wanted) => {
          assert(Array.isArray(actual) && actual.length === wanted.length, "Unexpected claim count");
          for (const row of wanted) {
            const found = actual.find((item) => item.id === row.id);
            assert(found?.proof === row.proof, "Unexpected claim proof");
          }
        };
        const list = await request(actor.token, "claim_requests", "GET", null, null,
          `post_id=eq.${posts[0].id}&select=id,proof`);
        assert(list.response.ok, "Claim list request failed");
        assertClaims(list.body, expected); checks++;
        for (const claim of [rows.claim_requests[0], otherClaim]) {
          const read = await request(actor.token, "claim_requests", "GET", null, claim.id, "select=id,proof");
          assert(read.response.ok, "Claim ID request failed");
          assertClaims(read.body, expected.filter((row) => row.id === claim.id)); checks++;
        }
        const embedded = await request(actor.token, "posts", "GET", null, posts[0].id,
          "select=id,claim_requests(id,proof)");
        const visible = privileged || ["published", "closed"].includes(state);
        assert(embedded.response.ok && Array.isArray(embedded.body) && embedded.body.length === (visible ? 1 : 0),
          "Unexpected embedded post visibility");
        if (visible) assertClaims(embedded.body[0].claim_requests, expected);
        checks++;
      }
    }
    requireResult(await service.from("posts").update({ moderation: "published", deleted_at: null,
      status: "searching" }).eq("id", posts[0].id).select(), "Restore claim fixture post");
    console.log("A5 PASS: 100 claim list/ID/embedded reads across five actors and five post states.");
    stage = "A6 create/cancel RPC";
    const rpc = async (actor, name, payload) => {
      const result = await request(actor?.token || "", `rpc/${name}`, "POST", payload);
      if (result.response.ok && typeof result.body === "string" && !ids.claim_requests.includes(result.body)) {
        ids.claim_requests.push(result.body);
      }
      return result;
    };
    const denyRpc = (result, code) => {
      assert(!result.response.ok && result.body?.code === code, "Unexpected RPC denial"); checks++;
    };
    const newPost = async (change = {}) => {
      const post = { ...posts[0], id: randomUUID(), ...change };
      ids.posts.push(post.id);
      return requireResult(await service.from("posts").insert(post).select().single(), "Create A6 fixture post");
    };
    const proofVectors = JSON.parse(await readFile(new URL("../tests/fixtures/claim-proofs.json", import.meta.url), "utf8"));
    for (const [index, vector] of proofVectors.entries()) {
      stage = `A6 proof vector ${index}`;
      const post = await newPost();
      const proof = vector.text.repeat(vector.repeat);
      const result = await rpc(outsider, "create_claim", { p_post_id: post.id, p_proof: proof });
      if (!vector.valid) {
        denyRpc(result, "22023");
        const claims = requireResult(await service.from("claim_requests").select("id").eq("post_id", post.id), "Read invalid proof fixture");
        assert.equal(claims.length, 0); checks++;
      } else {
        assert(result.response.ok && typeof result.body === "string", "Valid proof rejected");
        const claim = requireResult(await service.from("claim_requests").select("*").eq("id", result.body).single(), "Read created claim");
        assert.equal(claim.proof, proof.trim()); assert.equal(claim.requester_id, outsider.id);
        assert.equal(claim.status, "pending"); assert.equal(claim.post_id, post.id); checks++;
        const savedPost = requireResult(await service.from("posts").select("*").eq("id", post.id).single(), "Read claim post");
        const history = requireResult(await service.from("status_history").select("id").eq("post_id", post.id), "Read claim history");
        assert.deepEqual(savedPost, post); assert.equal(history.length, 0); checks++;
      }
    }
    const invalidPost = await newPost();
    stage = "A6 RPC input types and create eligibility";
    for (const p_proof of [null, 1234567890, { note: "Long fake proof" }, ["Long fake proof"]]) {
      const result = await rpc(outsider, "create_claim", { p_post_id: invalidPost.id, p_proof });
      assert(!result.response.ok && ["22023", "22P02"].includes(result.body?.code), "Invalid proof type accepted"); checks++;
    }
    denyRpc(await rpc(null, "create_claim", { p_post_id: invalidPost.id, p_proof: "Disposable fake proof" }), "42501");
    denyRpc(await rpc(member, "create_claim", { p_post_id: invalidPost.id, p_proof: "Disposable fake proof" }), "42501");
    for (const change of [{ type: "lost" }, { moderation: "pending" }, { moderation: "hidden" },
      { deleted_at: "2026-01-02T00:00:00Z" }, { status: "closed" }, { status: "verifying" }, { status: "returned" }]) {
      const post = await newPost(change);
      for (const actor of [outsider, admin]) {
        denyRpc(await rpc(actor, "create_claim", { p_post_id: post.id, p_proof: "Disposable fake proof" }), "42501");
      }
    }
    denyRpc(await rpc(outsider, "create_claim", { p_post_id: randomUUID(), p_proof: "Disposable fake proof" }), "42501");
    denyRpc(await rpc(outsider, "create_claim", { p_post_id: "invalid", p_proof: "Disposable fake proof" }), "22P02");
    denyRpc(await rpc(outsider, "create_claim", { p_post_id: invalidPost.id, p_proof: "Disposable fake proof", requester_id: stranger.id }), "PGRST202");
    for (const actor of [outsider, admin]) {
      const post = await newPost({ status: "matched" });
      const result = await rpc(actor, "create_claim", { p_post_id: post.id, p_proof: "Disposable fake proof" });
      assert(result.response.ok, "Eligible member/admin cannot create"); checks++;
      const cancel = await rpc(actor, "cancel_claim", { p_claim_id: result.body });
      assert(cancel.response.ok && cancel.body === result.body, "Requester cannot cancel own claim"); checks++;
    }
    for (const state of ["published", "pending", "hidden", "deleted", "closed"]) {
      stage = `A6 cancel on ${state}`;
      const post = await newPost();
      const result = await rpc(outsider, "create_claim", { p_post_id: post.id, p_proof: "Disposable fake proof" });
      assert(result.response.ok, "Cannot prepare pending claim"); checks++;
      const claimId = result.body;
      const other = { id: randomUUID(), post_id: post.id, requester_id: stranger.id, proof: "Other disposable proof" };
      ids.claim_requests.push(other.id);
      requireResult(await service.from("claim_requests").insert(other).select(), "Seed untouched A6 claim");
      const before = await snapshot();
      for (const actor of [null, member, stranger, admin]) {
        denyRpc(await rpc(actor, "cancel_claim", { p_claim_id: claimId }), "42501");
      }
      assert.deepEqual(await snapshot(), before, "Denied RPC changed data"); checks++;
      requireResult(await service.from("posts").update({
        moderation: ["hidden", "pending"].includes(state) ? state : "published",
        deleted_at: state === "deleted" ? "2026-01-02T00:00:00Z" : null,
        status: state === "closed" ? "closed" : "searching",
      }).eq("id", post.id).select(), "Change A6 fixture visibility");
      const unchanged = await snapshot();
      const cancelled = await rpc(outsider, "cancel_claim", { p_claim_id: claimId });
      assert(cancelled.response.ok && cancelled.body === claimId, "Pending cancellation failed"); checks++;
      const after = await snapshot();
      for (const table of tables.filter((table) => table !== "claim_requests")) {
        assert.deepEqual(after[table], unchanged[table], "Cancel changed unrelated data");
      }
      assert.deepEqual(after.claim_requests.filter((row) => row.id !== claimId), unchanged.claim_requests.filter((row) => row.id !== claimId));
      const saved = after.claim_requests.find((row) => row.id === claimId);
      const original = unchanged.claim_requests.find((row) => row.id === claimId);
      assert(saved.updated_at >= original.updated_at);
      assert.deepEqual(saved, { ...original, status: "cancelled", updated_at: saved.updated_at }); checks++;
      denyRpc(await rpc(outsider, "cancel_claim", { p_claim_id: claimId }), "42501");
      requireResult(await service.from("posts").update({ moderation: "published", deleted_at: null, status: "searching" }).eq("id", post.id).select(), "Restore A6 fixture");
      denyRpc(await rpc(outsider, "create_claim", { p_post_id: post.id, p_proof: "Another disposable proof" }), "23505");
    }
    const racePost = await newPost();
    stage = "A6 concurrent creates";
    const race = await Promise.all([1, 2].map(() => rpc(outsider, "create_claim", { p_post_id: racePost.id, p_proof: "Disposable race proof" })));
    assert.equal(race.filter((result) => result.response.ok).length, 1);
    denyRpc(race.find((result) => !result.response.ok), "23505");
    const raceClaim = race.find((result) => result.response.ok).body;
    const racedRows = requireResult(await service.from("claim_requests").select("id").eq("post_id", racePost.id), "Read race claims");
    assert.deepEqual(racedRows, [{ id: raceClaim }]); checks++;
    stage = "A6 concurrent cancels";
    const cancels = await Promise.all([1, 2].map(() => rpc(outsider, "cancel_claim", { p_claim_id: raceClaim })));
    assert.equal(cancels.filter((result) => result.response.ok).length, 1);
    denyRpc(cancels.find((result) => !result.response.ok), "42501");
    for (const status of ["accepted", "rejected", "cancelled", "completed"]) {
      requireResult(await service.from("claim_requests").update({ status }).eq("id", raceClaim).select(), "Set processed fixture claim");
      const before = await snapshot();
      denyRpc(await rpc(outsider, "cancel_claim", { p_claim_id: raceClaim }), "42501");
      denyRpc(await rpc(outsider, "create_claim", { p_post_id: racePost.id, p_proof: "Disposable duplicate proof" }), "23505");
      assert.deepEqual(await snapshot(), before, "Processed claim changed"); checks++;
    }
    denyRpc(await rpc(outsider, "cancel_claim", { p_claim_id: randomUUID() }), "42501");
    denyRpc(await rpc(outsider, "cancel_claim", { p_claim_id: "invalid" }), "22P02");
    console.log("A6 PASS: proof vectors, create/cancel permissions, post states, duplicates and concurrent writes.");
    const seedClaim = async (post, actor = outsider) => {
      const row = { id: randomUUID(), post_id: post.id, requester_id: actor.id, proof: "Disposable A7 proof" };
      ids.claim_requests.push(row.id);
      return requireResult(await service.from("claim_requests").insert(row).select().single(), "Seed A7 claim");
    };
    const decisionState = async (post) => ({
      post: requireResult(await service.from("posts").select("*").eq("id", post.id).single(), "Read A7 post"),
      claims: requireResult(await service.from("claim_requests").select("*").eq("post_id", post.id).order("id"), "Read A7 claims"),
      history: requireResult(await service.from("status_history").select("*").eq("post_id", post.id), "Read A7 history"),
    });
    const assertAccepted = (before, after, claimId) => {
      const old = before.claims.find((row) => row.id === claimId);
      const saved = after.claims.find((row) => row.id === claimId);
      assert(saved.updated_at >= old.updated_at);
      assert.deepEqual(saved, { ...old, status: "accepted", updated_at: saved.updated_at });
      assert(after.post.updated_at >= before.post.updated_at);
      assert.deepEqual(after.post, { ...before.post, status: "verifying", updated_at: after.post.updated_at });
      assert.deepEqual(after.claims.filter((row) => row.id !== claimId), before.claims.filter((row) => row.id !== claimId));
      assert.equal(after.history.length, 1);
      const history = after.history[0];
      assert.equal(history.from_status, before.post.status); assert.equal(history.to_status, "verifying");
      assert.equal(history.actor_id, before.post.owner_id); assert.equal(history.note, null);
      ids.status_history.push(history.id); checks++;
    };
    for (const status of ["searching", "matched"]) {
      stage = `A7 accept ${status}`;
      const post = await newPost({ status });
      const claim = await seedClaim(post); await seedClaim(post, stranger);
      const before = await decisionState(post);
      for (const actor of [null, outsider, stranger, admin]) {
        for (const name of ["accept_claim", "reject_claim"]) denyRpc(await rpc(actor, name, { p_claim_id: claim.id }), "42501");
      }
      assert.deepEqual(await decisionState(post), before); checks++;
      const accepted = await rpc(member, "accept_claim", { p_claim_id: claim.id });
      assert(accepted.response.ok && accepted.body === claim.id); checks++;
      assertAccepted(before, await decisionState(post), claim.id);
      // Exercise the exact owner-scoped recovery projection used by the server action.
      const readback = await request(member.token, "claim_requests", "GET", null, claim.id,
        `select=id,status,posts!inner(owner_id)&posts.owner_id=eq.${member.id}`);
      assert(readback.response.ok && readback.body.length === 1 && readback.body[0].status === "accepted"); checks++;
      const foreign = await request(admin.token, "claim_requests", "GET", null, claim.id,
        `select=id,status,posts!inner(owner_id)&posts.owner_id=eq.${admin.id}`);
      assert(foreign.response.ok && foreign.body.length === 0); checks++;
      denyRpc(await rpc(member, "accept_claim", { p_claim_id: claim.id }), "42501");
      denyRpc(await rpc(member, "reject_claim", { p_claim_id: claim.id }), "42501");
    }
    for (const change of [{ moderation: "pending" }, { moderation: "hidden" }, { deleted_at: "2026-01-02T00:00:00Z" },
      { status: "closed" }, { status: "verifying" }, { status: "returned" }, { type: "lost" }]) {
      stage = "A7 ineligible accept and unrestricted pending reject";
      const post = await newPost(change); const claim = await seedClaim(post); await seedClaim(post, stranger);
      const before = await decisionState(post);
      denyRpc(await rpc(member, "accept_claim", { p_claim_id: claim.id }), "42501");
      assert.deepEqual(await decisionState(post), before); checks++;
      const rejected = await rpc(member, "reject_claim", { p_claim_id: claim.id });
      assert(rejected.response.ok && rejected.body === claim.id); checks++;
      const after = await decisionState(post);
      const saved = after.claims.find((row) => row.id === claim.id);
      assert(saved.updated_at >= claim.updated_at);
      assert.deepEqual(saved, { ...claim, status: "rejected", updated_at: saved.updated_at });
      assert.deepEqual(after.post, before.post); assert.deepEqual(after.history, before.history);
      assert.deepEqual(after.claims.filter((row) => row.id !== claim.id), before.claims.filter((row) => row.id !== claim.id)); checks++;
      denyRpc(await rpc(member, "reject_claim", { p_claim_id: claim.id }), "42501");
    }
    for (const status of ["accepted", "completed", "cancelled", "rejected"]) {
      stage = `A7 processed ${status}`;
      const post = await newPost(); const claim = await seedClaim(post);
      requireResult(await service.from("claim_requests").update({ status }).eq("id", claim.id).select(), "Set A7 processed fixture");
      const before = await decisionState(post);
      for (const name of ["accept_claim", "reject_claim"]) denyRpc(await rpc(member, name, { p_claim_id: claim.id }), "42501");
      assert.deepEqual(await decisionState(post), before); checks++;
      if (["accepted", "completed"].includes(status)) {
        const other = await seedClaim(post, stranger);
        const conflict = await service.from("claim_requests").update({ status }).eq("id", other.id);
        assert.equal(conflict.error?.code, "23505"); checks++;
        denyRpc(await rpc(member, "accept_claim", { p_claim_id: other.id }), "42501");
      }
    }
    for (const competing of ["accept_claim", "cancel_claim", "reject_claim"]) {
      // Repeat independent fixtures to exercise both lock ordering and conditional pending updates.
      for (let iteration = 0; iteration < 3; iteration++) {
        stage = `A7 race accept versus ${competing}`;
        const post = await newPost(); const claim = await seedClaim(post); const other = await seedClaim(post, stranger);
        const before = await decisionState(post);
        const secondId = competing === "accept_claim" ? other.id : claim.id;
        const race = await Promise.all([
          rpc(member, "accept_claim", { p_claim_id: claim.id }),
          rpc(competing === "cancel_claim" ? outsider : member, competing, { p_claim_id: secondId }),
        ]);
        assert.equal(race.filter((result) => result.response.ok).length, 1); checks++;
        denyRpc(race.find((result) => !result.response.ok), "42501");
        const after = await decisionState(post);
        const winner = race.findIndex((result) => result.response.ok);
        if (winner === 0 || competing === "accept_claim") {
          assertAccepted(before, after, winner === 0 ? claim.id : other.id);
          // The other pending claim remains cancellable/rejectable while the post verifies.
          const remaining = after.claims.find((row) => row.status === "pending");
          const reject = await rpc(member, "reject_claim", { p_claim_id: remaining.id });
          assert(reject.response.ok); checks++;
        } else {
          assert.deepEqual(after.post, before.post); assert.equal(after.history.length, 0);
          const changed = after.claims.find((row) => row.id === claim.id);
          assert.deepEqual(changed, { ...claim, status: competing === "cancel_claim" ? "cancelled" : "rejected", updated_at: changed.updated_at });
          assert.deepEqual(after.claims.find((row) => row.id === other.id), other); checks++;
        }
      }
    }
    stage = "A7 admin as actual owner and invalid payloads";
    const adminPost = await newPost({ owner_id: admin.id }); const adminClaim = await seedClaim(adminPost);
    const adminBefore = await decisionState(adminPost);
    assert((await rpc(admin, "accept_claim", { p_claim_id: adminClaim.id })).response.ok); checks++;
    assertAccepted(adminBefore, await decisionState(adminPost), adminClaim.id);
    const pendingAdminClaim = await seedClaim(adminPost, stranger);
    assert((await rpc(admin, "reject_claim", { p_claim_id: pendingAdminClaim.id })).response.ok); checks++;
    for (const name of ["accept_claim", "reject_claim"]) {
      denyRpc(await rpc(member, name, { p_claim_id: randomUUID() }), "42501");
      denyRpc(await rpc(member, name, { p_claim_id: "invalid" }), "22P02");
      denyRpc(await rpc(member, name, { p_claim_id: adminClaim.id, owner_id: member.id }), "PGRST202");
    }
    console.log("A7 PASS: owner decisions, atomic effects, recovery projection, unique recipients and three race variants.");
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
      for (const type of ["found", "lost"]) {
        stage = `${actor.name}: B1a create ${type} post`;
        const valid = { owner_id: actor.id, type, title: "Post fixture", category: "other", color: "black",
          description: "Disposable found post fixture", location: "Test", occurred_at: "2026-01-01" };
        const created = await request(actor.token, "posts", "POST", valid);
        if (!actor.token) {
          assertDenied(created.response, created.body, "POST"); checks++;
        } else {
          assert(created.response.ok && created.body.length === 1, "Own post insert must succeed");
          const post = created.body[0];
          assert.equal(post.owner_id, actor.id); assert.equal(post.type, type);
          assert.equal(post.status, "searching"); assert.equal(post.moderation, "pending");
          assert.equal(post.deleted_at, null); checks++;
          const own = await request(actor.token, "posts", "GET", null, post.id);
          assert(own.response.ok && own.body.length === 1, "Owner reads pending post"); checks++;
          const outsider = await request(actor.id === member.id ? stranger.token : member.token, "posts", "GET", null, post.id);
          assert(outsider.response.ok && outsider.body.length === 0, "Stranger cannot read pending post"); checks++;
          const guest = await request("", "posts", "GET", null, post.id);
          assert(guest.response.ok && guest.body.length === 0, "Guest cannot read pending post"); checks++;
          for (const change of [{ owner_id: actor.id === member.id ? stranger.id : member.id },
            { moderation: "published" }, { status: "returned" }, { id: ids.posts[1] },
            { created_at: "2000-01-01T00:00:00Z" }, { updated_at: "2000-01-01T00:00:00Z" }, { deleted_at: null }]) {
            const attack = await request(actor.token, "posts", "POST", { ...valid, ...change });
            assertDenied(attack.response, attack.body, "POST"); checks++;
          }
          const badType = await request(actor.token, "posts", "POST", { ...valid, type: "invalid" });
          assert(badType.response.status === 400 && badType.body.code === "22P02", "Invalid post type rejected"); checks++;
          for (const change of [{ title: "a" }, { title: "a".repeat(101) }, { title: "    " },
            { category: "" }, { color: "a".repeat(41) }, { description: "short" },
            { description: "a".repeat(1001) }, { location: "a" }, { location: "a".repeat(121) },
            { occurred_at: "2026-02-30" }]) {
            const attack = await request(actor.token, "posts", "POST", { ...valid, ...change });
            assert(attack.response.status === 400 && ["23514", "22008", "22007"].includes(attack.body.code), "Invalid content must fail validation"); checks++;
          }
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
    try {
      const history = await service.from("status_history").select("id").in("post_id", ids.posts);
      if (history.error || !Array.isArray(history.data) || history.data.length) cleanupErrors.push("history by post readback");
    } catch { cleanupErrors.push("history by post readback"); }
    for (const table of tables) {
      try {
        const remaining = await service.from(table).select("id").in("id", ids[table]);
        if (remaining.error || !Array.isArray(remaining.data) || remaining.data.length) cleanupErrors.push(`${table} readback`);
      } catch { cleanupErrors.push(`${table} readback`); }
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
