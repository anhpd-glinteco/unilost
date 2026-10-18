import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelClaim, createClaim } from "@/features/claims/actions";
import { claimSchema } from "@/lib/validation";
import vectors from "../fixtures/claim-proofs.json";

const mocks = vi.hoisted(() => ({ account: vi.fn(), client: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/auth/account", () => ({ getAccount: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
const userId = "00000000-0000-4000-8000-000000000001";
const postId = "00000000-0000-4000-8000-000000000002";
const claimId = "00000000-0000-4000-8000-000000000003";
const initial = { error: "", claimId: null, status: null };
function form(extra: Record<string, string> = {}) {
  const data = new FormData();
  Object.entries({ postId, claimId, proof: "  Fake proof text  ", ...extra }).forEach(([key, value]) => data.set(key, value));
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue({ user: { id: userId }, profile: { id: userId } });
  mocks.client.mockResolvedValue({ rpc: mocks.rpc, from: mocks.from });
  mocks.rpc.mockResolvedValue({ data: claimId, error: null });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
});
describe("claim proof vectors shared with DB runner", () => {
  it.each(vectors.map((vector, index) => ({ ...vector, index })))("vector $index", ({ text, repeat, valid }) => {
    const proof = text.repeat(repeat);
    const parsed = claimSchema.safeParse({ proof });
    expect(parsed.success).toBe(valid);
    if (parsed.success) expect(parsed.data.proof).toBe(proof.trim());
  });
});
describe("claim actions", () => {
  it("creates using only validated RPC fields", async () => {
    expect(await createClaim(initial, form({ requester_id: "victim", role: "admin", status: "accepted" })))
      .toEqual({ error: "", claimId, status: "pending" });
    expect(mocks.rpc).toHaveBeenCalledWith("create_claim", { p_post_id: postId, p_proof: "Fake proof text" });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("cancels using only claim ID", async () => {
    expect(await cancelClaim(initial, form())).toEqual({ error: "", claimId, status: "cancelled" });
    expect(mocks.rpc).toHaveBeenCalledWith("cancel_claim", { p_claim_id: claimId });
  });
  it.each([createClaim, cancelClaim])("requires account and profile", async (action) => {
    for (const account of [{ user: null, profile: null }, { user: { id: userId }, profile: null }]) {
      mocks.account.mockResolvedValue(account);
      expect((await action(initial, form())).error).not.toBe("");
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{ postId: "invalid" }, { proof: "short" }, { proof: " ".repeat(20) }])("rejects invalid create input", async (extra) => {
    expect((await createClaim(initial, form(extra))).claimId).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects file input and invalid cancellation ID", async () => {
    const data = form(); data.set("proof", new File(["fake"], "proof.txt"));
    expect((await createClaim(initial, data)).claimId).toBeNull();
    expect((await cancelClaim(initial, form({ claimId: "invalid" }))).claimId).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([null, "invalid", { id: claimId }])("does not claim success without UUID", async (data) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    expect((await createClaim(initial, form())).error).not.toBe("");
  });
  it("rejects a cancellation response for another ID", async () => {
    mocks.rpc.mockResolvedValue({ data: postId, error: null });
    expect((await cancelClaim(initial, form())).error).not.toBe("");
  });
  it.each(["duplicate", "transport", "malformed"])("reads own existing claim after %s without reporting a new success", async (failure) => {
    if (failure === "transport") mocks.rpc.mockRejectedValue(new Error("secret"));
    else mocks.rpc.mockResolvedValue({ data: null, error: failure === "duplicate" ? { code: "23505", message: "secret" } : null });
    mocks.maybeSingle.mockResolvedValue({ data: { id: claimId, status: "cancelled", proof: "private" }, error: null });
    const result = await createClaim(initial, form());
    expect(result).toMatchObject({ claimId, status: "cancelled" });
    expect(result.error).not.toBe("");
    expect(result.error).not.toMatch(/secret|private/);
    expect(mocks.select).toHaveBeenCalledWith("id,status");
    expect(mocks.eq.mock.calls).toEqual([["requester_id", userId], ["post_id", postId]]);
  });
  it("reads current own status after cancellation loses a race", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    mocks.maybeSingle.mockResolvedValue({ data: { id: claimId, status: "accepted" }, error: null });
    const result = await cancelClaim(initial, form());
    expect(result.status).toBe("accepted"); expect(result.error).not.toBe("");
    expect(mocks.eq.mock.calls).toEqual([["requester_id", userId], ["id", claimId]]);
  });
  it.each(["config", "auth", "read", "read-shape", "read-error"])("handles %s failures safely", async (failure) => {
    mocks.rpc.mockRejectedValue(new Error("secret"));
    if (failure === "config") mocks.client.mockResolvedValue(null);
    if (failure === "auth") mocks.account.mockRejectedValue(new Error("secret"));
    if (failure === "read") mocks.maybeSingle.mockRejectedValue(new Error("secret"));
    if (failure === "read-shape") mocks.maybeSingle.mockResolvedValue({ data: { id: claimId, status: "unknown" }, error: null });
    if (failure === "read-error") mocks.maybeSingle.mockResolvedValue({ data: { id: claimId, status: "pending" }, error: { message: "secret" } });
    const result = await createClaim(initial, form());
    expect(result.claimId).toBeNull(); expect(result.error).not.toBe(""); expect(result.error).not.toContain("secret");
  });
});
