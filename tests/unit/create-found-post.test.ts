import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFoundPost } from "@/features/posts/actions";
import { foundPostSchema } from "@/features/posts/schemas";

const mocks = vi.hoisted(() => ({ account: vi.fn(), client: vi.fn(), from: vi.fn(), insert: vi.fn(), select: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/auth/account", () => ({ getAccount: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
const id = "00000000-0000-4000-8000-000000000001";
const valid = { type: "found", title: "Found wallet", category: "other", color: "black", description: "A wallet with a distinctive sticker", location: "Library", occurredAt: "2026-10-17" };
const initial = { error: "", postId: null };
function form(data = valid) { const result = new FormData(); Object.entries(data).forEach(([key, value]) => result.set(key, value)); return result; }
beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue({ user: { id }, profile: { id } });
  mocks.client.mockResolvedValue({ from: mocks.from });
  mocks.from.mockReturnValue({ insert: mocks.insert });
  mocks.insert.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ single: mocks.single });
  mocks.single.mockResolvedValue({ error: null, data: { id } });
});
describe("found input", () => {
  it("trims and accepts leap days", () => {
    expect(foundPostSchema.parse({ ...valid, title: "  Wallet  ", occurredAt: "2024-02-29" }).title).toBe("Wallet");
  });
  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "0000-01-01", "2026-1-01", "invalid"]) ("rejects invalid date %s", (occurredAt) => {
    expect(foundPostSchema.safeParse({ ...valid, occurredAt }).success).toBe(false);
  });
  it.each([{ title: "   " }, { title: "a".repeat(101) }, { color: "a".repeat(41) }, { category: " " }, { description: "short" }, { description: "a".repeat(1001) }, { location: "a".repeat(121) }, { type: "lost" }]) ("rejects invalid content %j", (change) => {
    expect(foundPostSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});
describe("create found action", () => {
  it("whitelists fields, fixes type and uses session owner", async () => {
    const values = form({ ...valid, title: "  Found wallet  ", type: "lost" });
    Object.entries({ owner_id: "victim", status: "returned", moderation: "published", id: "forged" }).forEach(([key, value]) => values.set(key, value));
    expect(await createFoundPost({ error: "forged", postId: id }, values)).toEqual({ error: "", postId: id });
    expect(mocks.insert).toHaveBeenCalledWith({ type: "found", owner_id: id, title: valid.title, category: valid.category, color: valid.color, description: valid.description, location: valid.location, occurred_at: valid.occurredAt });
    expect(mocks.select).toHaveBeenCalledWith("id");
  });
  it.each([{ user: null, profile: null }, { user: { id }, profile: null }]) ("rejects missing account %j", async (account) => {
    mocks.account.mockResolvedValue(account);
    expect((await createFoundPost(initial, form())).postId).toBeNull();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("rejects files and invalid input before insertion", async () => {
    const values = form(); values.set("title", new File(["test"], "test.txt"));
    expect((await createFoundPost(initial, values)).postId).toBeNull();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it.each([null, { id: "invalid" }]) ("requires a returned UUID %j", async (data) => {
    mocks.single.mockResolvedValue({ error: null, data });
    expect((await createFoundPost(initial, form())).postId).toBeNull();
  });
  it.each(["db", "network", "auth", "config"]) ("handles %s errors safely", async (failure) => {
    if (failure === "db") mocks.single.mockResolvedValue({ error: { message: "secret" }, data: { id } });
    if (failure === "network") mocks.single.mockRejectedValue(new Error("secret"));
    if (failure === "auth") mocks.account.mockRejectedValue(new Error("secret"));
    if (failure === "config") mocks.client.mockResolvedValue(null);
    const result = await createFoundPost(initial, form());
    expect(result.postId).toBeNull(); expect(result.error).not.toContain("secret");
  });
});
