import { beforeEach, expect, it, vi } from "vitest";
import { readPost } from "@/features/posts/queries";

const mocks = vi.hoisted(() => ({ client: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
const post = { id: "12345678-1234-4234-8234-123456789abc", type: "found", title: "Found keys", category: "keys", color: "black", description: "Found near library", location: "Library", occurred_at: "2026-01-01", status: "searching", moderation: "published", deleted_at: null };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.mockResolvedValue({ from: mocks.from });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ is: mocks.is });
  mocks.is.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: post, error: null });
});

it.each(["p-001", "bad", "", "../admin"])("rejects invalid ID %s before creating a client", async (id) => {
  expect(await readPost(id)).toEqual({ kind: "missing" });
  expect(mocks.client).not.toHaveBeenCalled();
});

it.each(["published", "pending", "hidden"])("renders %s rows allowed by session RLS", async (moderation) => {
  mocks.maybeSingle.mockResolvedValue({ data: { ...post, moderation }, error: null });
  expect(await readPost(post.id)).toEqual({ kind: "found", post: { ...post, moderation } });
  expect(mocks.client).toHaveBeenCalledWith(true);
  expect(mocks.from).toHaveBeenCalledWith("posts");
  expect(mocks.eq).toHaveBeenCalledWith("id", post.id);
  expect(mocks.is).toHaveBeenCalledWith("deleted_at", null);
  expect(mocks.select.mock.calls[0][0]).not.toMatch(/owner|proof|\*/);
});

it("does not cache rows across sessions", async () => {
  expect((await readPost(post.id)).kind).toBe("found");
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect(await readPost(post.id)).toEqual({ kind: "missing" });
  expect(mocks.client).toHaveBeenCalledTimes(2);
});

it.each([null, { ...post, deleted_at: "2026-01-02T00:00:00Z" }])("hides missing or deleted rows", async (data) => {
  mocks.maybeSingle.mockResolvedValue({ data, error: null });
  expect(await readPost(post.id)).toEqual({ kind: "missing" });
});

it.each(["config", "database", "network", "client", "invalid", "wrong-id", "invalid-date"])("returns safe error for %s", async (failure) => {
  if (failure === "config") mocks.client.mockResolvedValue(null);
  if (failure === "client") mocks.client.mockRejectedValue(new Error("secret"));
  if (failure === "database") mocks.maybeSingle.mockResolvedValue({ data: post, error: { message: "secret" } });
  if (failure === "network") mocks.maybeSingle.mockRejectedValue(new Error("secret"));
  if (failure === "invalid") mocks.maybeSingle.mockResolvedValue({ data: { ...post, status: "oops" }, error: null });
  if (failure === "wrong-id") mocks.maybeSingle.mockResolvedValue({ data: { ...post, id: "12345678-1234-4234-8234-123456789abd" }, error: null });
  if (failure === "invalid-date") mocks.maybeSingle.mockResolvedValue({ data: { ...post, occurred_at: "2026-02-30" }, error: null });
  expect(await readPost(post.id)).toEqual({ kind: "error" });
});
