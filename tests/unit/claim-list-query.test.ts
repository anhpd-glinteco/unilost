import { beforeEach, expect, it, vi } from "vitest";
import { parseClaimsPage, readClaimList } from "@/features/claims/queries";
const mocks = vi.hoisted(() => ({ account: vi.fn(), client: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() }));
vi.mock("@/lib/auth/account", () => ({ getAccount: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
const userId = "12345678-1234-4234-8234-123456789abc";
const otherId = "12345678-1234-4234-8234-123456789abd";
const row = { id: otherId, post_id: otherId, requester_id: userId, proof: "Fake proof only", status: "pending", created_at: "2026-10-18T10:00:00Z", posts: { id: otherId, owner_id: otherId, title: "Fake post", deleted_at: null } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue({ user: { id: userId }, profile: { id: userId, role: "user" } });
  mocks.client.mockResolvedValue({ from: mocks.from });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ order: mocks.order });
  mocks.order.mockReturnValue({ order: mocks.order, range: mocks.range });
  mocks.range.mockResolvedValue({ data: [row], error: null });
});
it.each([undefined, ["2"], "0", "-1", "1.5", "1e2", " 2", "02", "Infinity", "99999999999999999999", "107374183"])("defaults invalid page %j", value => expect(parseClaimsPage(value)).toBe(1));
it("accepts canonical pages with bounded offsets", () => { expect(parseClaimsPage("2")).toBe(2); expect(parseClaimsPage("107374182")).toBe(107374182); });
it.each(["user", "admin"])("filters sent list to authenticated requester for %s", async role => {
  mocks.account.mockResolvedValue({ user: { id: userId }, profile: { role } });
  expect(await readClaimList("sent", 2)).toEqual({ kind: "ready", claims: [row], hasNext: false });
  expect(mocks.client).toHaveBeenCalledWith(true);
  expect(mocks.eq).toHaveBeenCalledWith("requester_id", userId);
  expect(mocks.select).toHaveBeenCalledWith("id,post_id,requester_id,proof,status,created_at,posts(id,owner_id,title,deleted_at)");
  expect(mocks.order.mock.calls).toEqual([["created_at", { ascending: false }], ["id", { ascending: false }]]);
  expect(mocks.range).toHaveBeenCalledWith(20, 40);
});
it.each(["user", "admin"])("filters received list to authenticated owner for %s", async role => {
  mocks.account.mockResolvedValue({ user: { id: userId }, profile: { role } });
  const received = { ...row, requester_id: otherId, posts: { ...row.posts, owner_id: userId } };
  mocks.range.mockResolvedValue({ data: [received] });
  expect(await readClaimList("received", 1)).toEqual({ kind: "ready", claims: [received], hasNext: false });
  expect(mocks.eq).toHaveBeenCalledWith("posts.owner_id", userId);
  expect(mocks.select.mock.calls[0][0]).toContain("posts!inner(");
});
it.each([null, { ...row.posts, deleted_at: "2026-10-18T10:00:00Z" }])("retains sent claims when post unavailable %j", async posts => {
  mocks.range.mockResolvedValue({ data: [{ ...row, posts }] });
  expect((await readClaimList("sent", 1)).kind).toBe("ready");
});
it("returns only 20 rows and uses lookahead", async () => {
  mocks.range.mockResolvedValue({ data: Array.from({ length: 21 }, () => row) });
  const result = await readClaimList("sent", 1);
  expect(result.kind === "ready" && result.claims.length).toBe(20);
  expect(result.kind === "ready" && result.hasNext).toBe(true);
});
it("returns empty successful results", async () => {
  mocks.range.mockResolvedValue({ data: [] });
  expect(await readClaimList("sent", 1)).toEqual({ kind: "ready", claims: [], hasNext: false });
});
it.each(["guest", "profile", "client", "query", "throw", "invalid", "wrong-requester", "wrong-post", "page"])("fails safely on %s", async failure => {
  if (failure === "guest") mocks.account.mockResolvedValue({ user: null, profile: null });
  if (failure === "profile") mocks.account.mockResolvedValue({ user: { id: userId }, profile: null });
  if (failure === "client") mocks.client.mockResolvedValue(null);
  if (failure === "query") mocks.range.mockResolvedValue({ error: { message: "secret" } });
  if (failure === "throw") mocks.range.mockRejectedValue(new Error("secret"));
  if (failure === "invalid") mocks.range.mockResolvedValue({ data: [{ ...row, status: "unknown" }] });
  if (failure === "wrong-requester") mocks.range.mockResolvedValue({ data: [{ ...row, requester_id: otherId }] });
  if (failure === "wrong-post") mocks.range.mockResolvedValue({ data: [{ ...row, post_id: userId }] });
  expect(await readClaimList("sent", failure === "page" ? 0 : 1)).toEqual({ kind: "error" });
  if (["guest", "profile", "page"].includes(failure)) expect(mocks.client).not.toHaveBeenCalled();
});
it.each([null, row.posts])("rejects received rows without current ownership %j", async posts => {
  mocks.range.mockResolvedValue({ data: [{ ...row, posts }] });
  expect(await readClaimList("received", 1)).toEqual({ kind: "error" });
});
