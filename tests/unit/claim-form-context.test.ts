import { beforeEach, expect, it, vi } from "vitest";
import { readClaimFormContext } from "@/features/claims/queries";

const mocks = vi.hoisted(() => ({ account: vi.fn(), client: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/auth/account", () => ({ getAccount: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
const postId = "12345678-1234-4234-8234-123456789abc";
const userId = "12345678-1234-4234-8234-123456789abd";
const post = { owner_id: postId, type: "found", moderation: "published", status: "searching", deleted_at: null };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue({ user: { id: userId }, profile: { id: userId } });
  mocks.client.mockResolvedValue({ from: mocks.from });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.single });
  mocks.single.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValue({ data: post, error: null });
});
it("reads only own claim and eligibility fields through session RLS", async () => {
  expect(await readClaimFormContext(postId)).toEqual({ kind: "ready" });
  expect(mocks.client).toHaveBeenCalledWith(true);
  expect(mocks.eq).toHaveBeenCalledWith("requester_id", userId);
  expect(mocks.eq).toHaveBeenCalledWith("post_id", postId);
  expect(mocks.eq).toHaveBeenCalledWith("id", postId);
  expect(mocks.select.mock.calls.map(([fields]) => fields)).toEqual(["id,status", "owner_id,type,status,moderation,deleted_at"]);
});
it.each(["pending", "accepted", "rejected", "cancelled", "completed"])("locks existing %s claims without reading proof or owner", async (status) => {
  mocks.single.mockReset().mockResolvedValue({ data: { id: postId, status }, error: null });
  expect(await readClaimFormContext(postId)).toEqual({ kind: "existing", claim: { id: postId, status } });
  expect(mocks.from).toHaveBeenCalledTimes(1);
});
it.each([{ owner_id: userId }, { type: "lost" }, { moderation: "pending" }, { moderation: "hidden" }, { status: "verifying" }, { status: "returned" }, { status: "closed" }, { deleted_at: "2026-01-01T00:00:00Z" }])("blocks ineligible post %j", async (fields) => {
  mocks.single.mockReset().mockResolvedValueOnce({ data: null }).mockResolvedValue({ data: { ...post, ...fields } });
  expect(await readClaimFormContext(postId)).toEqual({ kind: "unavailable" });
});
it("allows matched posts", async () => {
  mocks.single.mockReset().mockResolvedValueOnce({ data: null }).mockResolvedValue({ data: { ...post, status: "matched" } });
  expect(await readClaimFormContext(postId)).toEqual({ kind: "ready" });
});
it("does not query for guests", async () => {
  mocks.account.mockResolvedValue({ user: null, profile: null });
  expect(await readClaimFormContext(postId)).toEqual({ kind: "guest" });
  expect(mocks.client).not.toHaveBeenCalled();
});
it.each(["profile", "client", "claim-query", "invalid-claim", "post-query", "missing-post", "network", "invalid-id"])("fails closed on %s", async (failure) => {
  if (failure === "profile") mocks.account.mockResolvedValue({ user: { id: userId }, profile: null });
  if (failure === "client") mocks.client.mockResolvedValue(null);
  if (failure === "claim-query") mocks.single.mockReset().mockResolvedValue({ error: { message: "secret" } });
  if (failure === "invalid-claim") mocks.single.mockReset().mockResolvedValue({ data: { id: postId, status: "unknown" } });
  if (failure === "post-query") mocks.single.mockReset().mockResolvedValueOnce({ data: null }).mockResolvedValue({ data: post, error: { message: "secret" } });
  if (failure === "missing-post") mocks.single.mockReset().mockResolvedValue({ data: null });
  if (failure === "network") mocks.account.mockRejectedValue(new Error("secret"));
  expect(await readClaimFormContext(failure === "invalid-id" ? "demo" : postId)).toEqual({ kind: "error" });
});
