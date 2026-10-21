import { beforeEach, expect, it, vi } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/posts/[id]/image/route";
import { imageExtension, MAX_IMAGE_BYTES, readImageBody } from "@/features/posts/image-file";

const mocks = vi.hoisted(() => ({ account: vi.fn(), client: vi.fn(), admin: vi.fn(), read: vi.fn(), image: vi.fn(), upload: vi.fn(), download: vi.fn(), remove: vi.fn(), rpc: vi.fn(), readback: vi.fn() }));
vi.mock("@/lib/auth/account", () => ({ getAccount: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
vi.mock("@/lib/supabase/storage-admin", () => ({ createStorageAdminClient: mocks.admin }));
const id = "00000000-0000-4000-8000-000000000001";
const owner = "00000000-0000-4000-8000-000000000002";
const old = `${owner}/${id}/00000000-0000-4000-8000-000000000003.png`;
const png = new Uint8Array([137,80,78,71,13,10,26,10,0]);
const context = { params: Promise.resolve({ id }) };
function query(read: typeof mocks.read) {
  const chain = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: read };
  chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.is.mockReturnValue(chain);
  return chain;
}
function request(method = "PUT", bytes: Uint8Array = png, extra: Record<string, string> = {}) {
  return new Request(`http://localhost/api/posts/${id}/image`, {
    method, headers: { origin: "http://localhost", "content-type": "image/png", ...extra },
    body: method === "PUT" ? new Uint8Array(bytes) : undefined,
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue({ user: { id: owner }, profile: { id: owner, role: "user" } });
  mocks.read.mockResolvedValue({ data: { id, owner_id: owner, status: "searching" }, error: null });
  mocks.image.mockResolvedValue({ data: { storage_path: old }, error: null });
  mocks.client.mockResolvedValue({ from: (table: string) => query(table === "posts" ? mocks.read : mocks.image) });
  mocks.admin.mockReturnValue({ storage: { from: () => ({ upload: mocks.upload, download: mocks.download, remove: mocks.remove }) }, rpc: mocks.rpc, from: () => query(mocks.readback) });
  mocks.upload.mockResolvedValue({ data: {}, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.rpc.mockResolvedValue({ data: id, error: null });
  mocks.readback.mockResolvedValue({ data: { storage_path: old }, error: null });
  mocks.download.mockResolvedValue({ data: new Blob([png], { type: "image/png" }), error: null });
});

it("accepts the three signatures only when MIME agrees", () => {
  expect(imageExtension(png, "image/png")).toBe("png");
  expect(imageExtension(new Uint8Array([255,216,255,224]), "image/jpeg")).toBe("jpg");
  const webp = new Uint8Array([82,73,70,70,8,0,0,0,87,69,66,80,86,80,56,32]);
  expect(imageExtension(webp, "image/webp")).toBe("webp");
  webp[4] = 7; expect(imageExtension(webp, "image/webp")).toBeNull();
  for (const mime of ["image/jpeg", "image/webp", "image/svg+xml", "text/html", ""]) expect(imageExtension(png, mime)).toBeNull();
  expect(imageExtension(new Uint8Array(), "image/png")).toBeNull();
});
it("enforces the exact byte limit and cancels an oversized chunked body", async () => {
  const exact = new Uint8Array(MAX_IMAGE_BYTES); exact.set(png);
  expect(imageExtension(exact, "image/png")).toBe("png");
  expect(imageExtension(new Uint8Array(MAX_IMAGE_BYTES + 1), "image/png")).toBeNull();
  const cancel = vi.fn();
  const stream = new ReadableStream({ start(controller) { controller.enqueue(exact); controller.enqueue(new Uint8Array(1)); }, cancel });
  const streamed = new Request("http://localhost", { method: "PUT", body: stream, duplex: "half" } as RequestInit);
  expect(await readImageBody(streamed)).toBeNull(); expect(cancel).toHaveBeenCalledOnce();
  expect(await readImageBody(request("PUT", png, { "content-length": `${MAX_IMAGE_BYTES + 1}` }))).toBeNull();
});
it("generates the path, validates bytes before upload, and cleans old only after RPC", async () => {
  const response = await PUT(request(), context);
  expect(await response.json()).toEqual({ confirmed: true, cleanupPending: false });
  const path = mocks.upload.mock.calls[0][0];
  expect(path).toMatch(new RegExp(`^${owner}/${id}/[a-f0-9-]{36}\\.png$`));
  expect(mocks.upload.mock.calls[0][2]).toEqual({ contentType: "image/png", upsert: false, cacheControl: "0" });
  expect(mocks.rpc).toHaveBeenCalledWith("set_post_image", { p_actor_id: owner, p_post_id: id, p_expected_path: old, p_new_path: path });
  expect(mocks.remove).toHaveBeenCalledWith([old]);
  expect(mocks.remove.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.rpc.mock.invocationCallOrder[0]);
});
it.each(["DELETE", "PUT"])("blocks cross-site %s and guest before privileged access", async (method) => {
  const handler = method === "PUT" ? PUT : DELETE;
  expect((await handler(request(method, png, { origin: "https://evil.test" }), context)).status).toBe(403);
  expect(mocks.account).not.toHaveBeenCalled();
  mocks.account.mockResolvedValue({ user: null, profile: null });
  expect((await handler(request(method), context)).status).toBe(401);
  expect(mocks.admin).not.toHaveBeenCalled();
});
it.each(["verifying", "returned", "closed"])("blocks %s mutations", async (status) => {
  mocks.read.mockResolvedValue({ data: { id, owner_id: owner, status }, error: null });
  expect((await PUT(request(), context)).status).toBe(403); expect(mocks.admin).not.toHaveBeenCalled();
});
it("fails closed for a missing profile, outsider admin, deleted/missing post and DB errors", async () => {
  mocks.account.mockResolvedValueOnce({ user: { id: owner }, profile: null });
  expect((await PUT(request(), context)).status).toBe(403);
  mocks.account.mockResolvedValueOnce({ user: { id }, profile: { role: "admin" } });
  expect((await PUT(request(), context)).status).toBe(403);
  mocks.read.mockResolvedValueOnce({ data: null, error: null });
  expect((await PUT(request(), context)).status).toBe(403);
  mocks.read.mockResolvedValueOnce({ data: null, error: {} });
  expect((await PUT(request(), context)).status).toBe(503);
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("does not upload mismatched content or invalid IDs and fails without server configuration", async () => {
  expect((await PUT(request("PUT", png, { "content-type": "image/jpeg" }), context)).status).toBe(415);
  expect((await PUT(request(), { params: Promise.resolve({ id: "demo" }) })).status).toBe(400);
  mocks.admin.mockReturnValue(null);
  expect((await PUT(request(), context)).status).toBe(503); expect(mocks.upload).not.toHaveBeenCalled();
});
it.each(["error", "throw"])("cleans an uncertain upload (%s) without invoking RPC", async (kind) => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  if (kind === "error") mocks.upload.mockResolvedValue({ error: {} }); else mocks.upload.mockRejectedValue(new Error());
  expect((await PUT(request(), context)).status).toBe(503);
  expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
  expect(mocks.rpc).not.toHaveBeenCalled();
  if (kind === "throw") expect(log).toHaveBeenCalledWith("B1e image upload uncertain", expect.objectContaining({ postId: id }));
  log.mockRestore();
});
it("uses one CAS mutation and cleans the new unlinked file after conflict", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "40001" } });
  expect((await PUT(request(), context)).status).toBe(503);
  expect(mocks.rpc).toHaveBeenCalledOnce();
  expect(mocks.remove).toHaveBeenCalledExactlyOnceWith([mocks.upload.mock.calls[0][0]]);
});
it("readbacks a lost committed response without retry or false success", async () => {
  mocks.rpc.mockRejectedValue(new Error("lost response"));
  mocks.readback.mockImplementation(async () => ({ data: { storage_path: mocks.upload.mock.calls[0][0] }, error: null }));
  expect((await PUT(request(), context)).status).toBe(503);
  expect(mocks.rpc).toHaveBeenCalledOnce(); expect(mocks.remove).toHaveBeenCalledExactlyOnceWith([old]);
});
it("retains both files and records readback failure for cleanup", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.rpc.mockRejectedValue(new Error()); mocks.readback.mockResolvedValue({ error: {} });
  expect((await PUT(request(), context)).status).toBe(503);
  expect(mocks.remove).not.toHaveBeenCalled(); expect(log).toHaveBeenCalledWith("B1e image readback pending", expect.objectContaining({ postId: id }));
  log.mockRestore();
});
it("also records a transport exception during readback without deleting a linked file", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.rpc.mockRejectedValue(new Error()); mocks.readback.mockRejectedValue(new Error());
  expect((await PUT(request(), context)).status).toBe(503);
  expect(mocks.remove).not.toHaveBeenCalled(); expect(log).toHaveBeenCalledOnce(); log.mockRestore();
});
it("reports cleanup failure after confirmed replace without undoing it", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.remove.mockRejectedValue(new Error());
  expect(await (await PUT(request(), context)).json()).toEqual({ confirmed: true, cleanupPending: true });
  expect(log).toHaveBeenCalledWith("B1e image cleanup pending", { postId: id, storagePath: old }); log.mockRestore();
});
it("deletes through the same locked RPC and does not upload", async () => {
  expect((await DELETE(request("DELETE"), context)).status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith("set_post_image", { p_actor_id: owner, p_post_id: id, p_expected_path: old, p_new_path: null });
  expect(mocks.remove).toHaveBeenCalledWith([old]); expect(mocks.upload).not.toHaveBeenCalled();
});
it("serves only a currently visible image with private/no-store and no redirect", async () => {
  const response = await GET(request("GET"), context);
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-type")).toBe("image/png"); expect(response.headers.get("location")).toBeNull();
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(png); expect(mocks.read).toHaveBeenCalledTimes(2);
});
it("denies GET when access is revoked during download or bytes are invalid", async () => {
  mocks.read.mockResolvedValueOnce({ data: { id, owner_id: owner, status: "searching" }, error: null }).mockResolvedValueOnce({ data: null, error: null });
  expect((await GET(request("GET"), context)).status).toBe(404);
  mocks.download.mockResolvedValue({ data: new Blob(["<svg/>"], { type: "image/svg+xml" }), error: null });
  expect((await GET(request("GET"), context)).status).toBe(415);
  mocks.image.mockResolvedValue({ data: null, error: null });
  expect((await GET(request("GET"), context)).status).toBe(404);
});
