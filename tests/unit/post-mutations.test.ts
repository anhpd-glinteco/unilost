import { beforeEach, expect, it, vi } from "vitest";
import { updatePost, closePost } from "@/features/posts/actions";
const mocks = vi.hoisted(() => ({ account: vi.fn(), client: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), is: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/auth/account", () => ({ getAccount: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
const id = "00000000-0000-4000-8000-000000000001";
const initial = { error: "", postId: null, status: null, moderation: null };
const content = { title: "Lost wallet", category: "other", color: "black", description: "A wallet with a distinctive sticker", location: "Library", occurredAt: "2026-10-17" };
function form() { const data = new FormData(); Object.entries({ ...content, postId: id, type: "found", owner_id: "victim", moderation: "published", status: "returned" }).forEach(([k,v]) => data.set(k,v)); return data; }
beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue({ user: { id }, profile: { id } });
  mocks.client.mockResolvedValue({ rpc: mocks.rpc, from: mocks.from });
  mocks.rpc.mockResolvedValue({ data: id, error: null });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq }); mocks.eq.mockReturnValue({ eq: mocks.eq, is: mocks.is });
  mocks.is.mockReturnValue({ maybeSingle: mocks.read });
  mocks.read.mockResolvedValue({ data: { id, status: "searching", moderation: "pending" }, error: null });
});
it("whitelists six fields and trims without allowing type/owner/state changes", async () => {
  const data = form(); data.set("title", "  Lost wallet  ");
  expect((await updatePost(initial, data)).error).toBe("");
  expect(mocks.rpc).toHaveBeenCalledWith("update_post", { p_post_id: id, p_content: content });
  expect(mocks.eq).toHaveBeenCalledWith("owner_id", id);
  expect(mocks.select).toHaveBeenCalledWith("id,status,moderation");
});
it("close only sends the ID and reports confirmed state", async () => {
  mocks.read.mockResolvedValue({ data: { id, status: "closed", moderation: "published" }, error: null });
  expect(await closePost(initial, form())).toEqual({ error: "", postId: id, status: "closed", moderation: "published" });
  expect(mocks.rpc).toHaveBeenCalledWith("close_post", { p_post_id: id });
});
it.each(["title", "occurredAt", "postId", "file"])("rejects invalid %s before RPC", async (field) => {
  const data = form(); data.set(field === "file" ? "title" : field, field === "file" ? new File(["x"], "x") : "invalid");
  if (field === "title") data.set("title", " ");
  expect((await updatePost(initial, data)).postId).toBeNull(); expect(mocks.rpc).not.toHaveBeenCalled();
});
it.each([updatePost, closePost])("handles missing account and config", async (action) => {
  for (const account of [{ user: null }, { user: { id }, profile: null }]) {
    mocks.account.mockResolvedValue(account); expect((await action(initial, form())).postId).toBeNull();
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.account.mockResolvedValue({ user: { id }, profile: { id } }); mocks.client.mockResolvedValue(null);
  expect((await action(initial, form())).postId).toBeNull();
});
it.each(["rpc-error", "lost-response", "wrong-id"])("reads current state without retry or false success: %s", async (failure) => {
  if (failure === "rpc-error") mocks.rpc.mockResolvedValue({ error: { message: "secret" } });
  if (failure === "lost-response") mocks.rpc.mockRejectedValue(new Error("secret"));
  if (failure === "wrong-id") mocks.rpc.mockResolvedValue({ data: "00000000-0000-4000-8000-000000000002" });
  const result = await updatePost(initial, form()); expect(result.postId).toBe(id); expect(result.error).not.toBe("");
  expect(result.error).not.toContain("secret"); expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it.each([null, { id: "invalid", status: "closed", moderation: "pending" }, { id, status: "invalid", moderation: "pending" }])("never succeeds without a valid readback", async (data) => {
  mocks.read.mockResolvedValue({ data, error: null }); expect((await closePost(initial, form())).postId).toBeNull();
});
it("hides readback transport errors", async () => {
  mocks.read.mockRejectedValue(new Error("secret")); const result = await closePost(initial, form());
  expect(result.postId).toBeNull(); expect(result.error).not.toContain("secret");
});
