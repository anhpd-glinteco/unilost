import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateProfile } from "@/app/dashboard/actions";
import { member } from "../fixtures/auth";

const mocks = vi.hoisted(() => ({ user: vi.fn(), client: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), result: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseUser: mocks.user, createSupabaseServerClient: mocks.client }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
const initial = { error: "", saved: false };
function form(name: string = "  Nguyễn An  ", faculty = "  CNTT  ") {
  const values = new FormData();
  values.set("full_name", name);
  values.set("faculty", faculty);
  return values;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SUPABASE_PROFILE_EDIT_ENABLED", "true");
  mocks.user.mockResolvedValue(member);
  mocks.client.mockResolvedValue({ from: mocks.from });
  mocks.from.mockReturnValue({ update: mocks.update });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ maybeSingle: mocks.result });
  mocks.result.mockResolvedValue({ error: null, data: { id: member.id, full_name: "Nguyễn An", faculty: "CNTT" } });
});
afterEach(() => vi.unstubAllEnvs());

describe("profile update", () => {
  it.each(["", "false"]) ("stays read-only without a verified DB gate (%s)", async (value) => {
    vi.stubEnv("SUPABASE_PROFILE_EDIT_ENABLED", value);
    expect((await updateProfile(initial, form())).saved).toBe(false);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it("whitelists fields and uses the verified ID, ignoring forged values and previous state", async () => {
    const values = form();
    values.set("id", "victim");
    values.set("role", "admin");
    values.set("created_at", "2000-01-01");
    expect(await updateProfile({ saved: true, error: "untrusted" }, values)).toEqual({ error: "", saved: true });
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.update).toHaveBeenCalledWith({ full_name: "Nguyễn An", faculty: "CNTT" });
    expect(mocks.eq).toHaveBeenCalledWith("id", member.id);
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  });

  it.each([null, undefined]) ("rejects a missing or expired session", async (user) => {
    mocks.user.mockResolvedValue(user);
    const state = await updateProfile(initial, form());
    expect(state.saved).toBe(false);
    expect(state.error).toContain("đăng nhập");
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it.each([["", ""], ["   ", "CNTT"], ["a".repeat(101), ""], ["Name", "a".repeat(101)]]) ("rejects invalid field lengths", async (name, faculty) => {
    expect((await updateProfile(initial, form(name, faculty))).saved).toBe(false);
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it.each(["full_name", "faculty"]) ("rejects files in %s", async (key) => {
    const values = form();
    values.set(key, new File(["data"], "name.txt"));
    expect((await updateProfile(initial, values)).saved).toBe(false);
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it("rejects an absent name", async () => {
    const values = form();
    values.delete("full_name");
    expect((await updateProfile(initial, values)).saved).toBe(false);
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it.each(["", "   "]) ("stores an empty faculty as null", async (faculty) => {
    mocks.result.mockResolvedValue({ error: null, data: { id: member.id, full_name: "Nguyễn An", faculty: null } });
    expect((await updateProfile(initial, form("Nguyễn An", faculty))).saved).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith({ full_name: "Nguyễn An", faculty: null });
  });

  it("accepts maximum lengths", async () => {
    mocks.result.mockResolvedValue({ error: null, data: { id: member.id, full_name: "n".repeat(100), faculty: "f".repeat(100) } });
    expect((await updateProfile(initial, form("n".repeat(100), "f".repeat(100)))).saved).toBe(true);
  });

  it.each(["missing", "wrong-id", "wrong-name", "wrong-faculty", "database", "network", "configuration", "auth-network"]) ("does not report success for %s", async (failure) => {
    const data = { id: member.id, full_name: "Nguyễn An", faculty: "CNTT" };
    if (failure === "wrong-id") data.id = "victim";
    if (failure === "wrong-name") data.full_name = "Other";
    if (failure === "wrong-faculty") data.faculty = "Other";
    mocks.result.mockResolvedValue({ data: failure === "missing" ? null : data, error: failure === "database" ? { message: "secret" } : null });
    if (failure === "network") mocks.result.mockRejectedValue(new Error("secret"));
    if (failure === "auth-network") mocks.user.mockRejectedValue(new Error("secret"));
    if (failure === "configuration") mocks.client.mockResolvedValue(null);
    const state = await updateProfile(initial, form());
    expect(state.saved).toBe(false);
    expect(state.error).not.toContain("secret");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
