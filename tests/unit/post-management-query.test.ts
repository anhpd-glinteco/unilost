import { beforeEach, expect, it, vi } from "vitest";
import { canManagePost } from "@/features/posts/queries";

const mocks = vi.hoisted(() => ({ account: vi.fn(), client: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), is: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/auth/account", () => ({ getAccount: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
const id = "12345678-1234-4234-8234-123456789abc";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue({ user: { id: "owner" }, profile: { role: "user" } });
  mocks.client.mockResolvedValue({ from: mocks.from });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, is: mocks.is });
  mocks.is.mockReturnValue({ maybeSingle: mocks.read });
  mocks.read.mockResolvedValue({ data: { id }, error: null });
});

it.each(["user", "admin"])("requires ownership for role %s without selecting owner data", async role => {
  mocks.account.mockResolvedValue({ user: { id: "owner" }, profile: { role } });
  expect(await canManagePost(id)).toBe(true);
  expect(mocks.eq).toHaveBeenCalledWith("owner_id", "owner");
  expect(mocks.is).toHaveBeenCalledWith("deleted_at", null);
  expect(mocks.select).toHaveBeenCalledWith("id");
});

it("accepts a valid uppercase UUID without exposing owner fields", async () => {
  expect(await canManagePost(id.toUpperCase())).toBe(true);
});

it.each(["guest", "profile", "outsider", "admin-outsider", "missing-config", "db", "network", "wrong-id", "invalid-id"])("fails closed for %s", async failure => {
  if (failure === "guest") mocks.account.mockResolvedValue({ user: null, profile: null });
  if (failure === "profile") mocks.account.mockResolvedValue({ user: { id: "owner" }, profile: null });
  if (failure === "admin-outsider") mocks.account.mockResolvedValue({ user: { id: "admin" }, profile: { role: "admin" } });
  if (["outsider", "admin-outsider"].includes(failure)) mocks.read.mockResolvedValue({ data: null, error: null });
  if (failure === "missing-config") mocks.client.mockResolvedValue(null);
  if (failure === "db") mocks.read.mockResolvedValue({ data: { id }, error: { message: "secret" } });
  if (failure === "network") mocks.read.mockRejectedValue(new Error("secret"));
  if (failure === "wrong-id") mocks.read.mockResolvedValue({ data: { id: "another" }, error: null });
  expect(await canManagePost(failure === "invalid-id" ? "bad" : id)).toBe(false);
  if (["guest", "profile", "invalid-id"].includes(failure)) expect(mocks.client).not.toHaveBeenCalled();
});
