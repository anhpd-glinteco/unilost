import { beforeEach, expect, it, vi } from "vitest";
import { readMatchCandidates } from "@/features/posts/match-candidates";
const m = vi.hoisted(() => ({ client: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), is: vi.fn(), in: vi.fn(), gt: vi.fn(), order: vi.fn(), range: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: m.client }));
const id = "00000000-0000-4000-8000-000000000000";
const row = { id, type: "lost", title: "Điện thoại", category: "Khác", color: "đen", description: "Fixture", location: "Test", occurred_at: "2026-10-01", created_at: "2026-10-01T00:00:00Z", status: "searching", moderation: "published", deleted_at: null };
function candidate(n: number) { return { ...row, type: "found", id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}` }; }
beforeEach(() => {
  vi.resetAllMocks(); m.client.mockResolvedValue(m);
  for (const name of ["from", "select", "eq", "is", "in", "gt", "order"] as const) m[name].mockReturnValue(m);
  m.maybeSingle.mockResolvedValue({ data: row, error: null });
  m.range.mockResolvedValue({ data: [], error: null });
});
it("reads all batches with a progressing ID cursor and public filters", async () => {
  m.range.mockResolvedValueOnce({ data: Array.from({ length: 200 }, (_, i) => candidate(i + 1)), error: null }).mockResolvedValueOnce({ data: [candidate(201)], error: null });
  const result = await readMatchCandidates(id);
  expect(result.kind).toBe("ok"); if (result.kind !== "ok") return;
  expect(result.posts).toHaveLength(201);
  expect(m.gt).toHaveBeenCalledWith("id", candidate(200).id);
  expect(m.eq).toHaveBeenCalledWith("moderation", "published"); expect(m.eq).toHaveBeenCalledWith("type", "found");
  expect(m.is).toHaveBeenCalledWith("deleted_at", null); expect(m.in).toHaveBeenCalledWith("status", ["searching", "matched"]);
  expect(m.order).toHaveBeenCalledWith("id", { ascending: true }); expect(m.range).toHaveBeenCalledWith(0, 199);
  expect(m.select.mock.calls[0][0]).not.toMatch(/owner|proof|\*/);
  expect(JSON.stringify(result)).not.toMatch(/owner|proof|deleted_at/);
});
it("returns empty separately from missing and invalid IDs", async () => {
  expect(await readMatchCandidates("bad")).toEqual({ kind: "missing" }); expect(m.client).not.toHaveBeenCalled();
  expect(await readMatchCandidates(id)).toMatchObject({ kind: "ok", posts: [] });
  m.maybeSingle.mockResolvedValue({ data: null, error: null }); expect(await readMatchCandidates(id)).toEqual({ kind: "missing" });
});
it.each(["hidden", "pending", "returned", "closed", "verifying", "deleted", "same-type", "duplicate", "malformed"])("rejects invalid candidate %s without partial results", async failure => {
  const bad = { ...candidate(1) };
  if (["hidden", "pending"].includes(failure)) bad.moderation = failure;
  if (["returned", "closed", "verifying"].includes(failure)) bad.status = failure;
  const data = failure === "duplicate" ? [bad, bad] : [failure === "deleted" ? { ...bad, deleted_at: "2026-01-01T00:00:00Z" } : failure === "same-type" ? row : failure === "malformed" ? {} : bad];
  m.range.mockResolvedValue({ data, error: null }); expect(await readMatchCandidates(id)).toEqual({ kind: "error" });
});
it.each(["config", "source", "batch", "throw"])("handles %s failures safely", async failure => {
  if (failure === "config") m.client.mockResolvedValue(null);
  if (failure === "source") m.maybeSingle.mockResolvedValue({ error: { message: "secret" } });
  if (failure === "batch") m.range.mockResolvedValue({ error: { message: "secret" } });
  if (failure === "throw") m.range.mockRejectedValue(new Error("secret"));
  expect(await readMatchCandidates(id)).toEqual({ kind: "error" });
});
it("does not query candidates for completed source", async () => {
  m.maybeSingle.mockResolvedValue({ data: { ...row, status: "returned" }, error: null });
  expect(await readMatchCandidates(id)).toMatchObject({ kind: "ok", posts: [] }); expect(m.range).not.toHaveBeenCalled();
});
