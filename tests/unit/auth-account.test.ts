import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccount, requireAccount } from "@/lib/auth/account";
import { member, memberProfile } from "../fixtures/auth";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseUser: mocks.getUser,
  createSupabaseServerClient: async () => ({ from: mocks.from }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
  notFound: () => { throw new Error("not-found"); },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue(member);
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockReset().mockResolvedValue({ data: memberProfile, error: null });
});

describe("verified account and guards", () => {
  it("reads only the verified user's profile, ignoring metadata roles", async () => {
    expect((await getAccount()).profile).toEqual(memberProfile);
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.eq).toHaveBeenCalledWith("id", member.id);
    await expect(requireAccount("/admin", true)).rejects.toThrow("not-found");
  });

  it.each(["/dashboard", "/dashboard/claims", "/posts/new", "/admin", "//evil.test"]) ("redirects guests safely from %s without querying profiles", async (path) => {
    mocks.getUser.mockResolvedValue(null);
    await expect(requireAccount(path)).rejects.toThrow(`redirect:/auth/login?next=${encodeURIComponent(path.startsWith("//") ? "/" : path)}`);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("allows members and server-confirmed admins", async () => {
    expect((await requireAccount("/dashboard")).user).toEqual(member);
    mocks.maybeSingle.mockResolvedValue({ data: { ...memberProfile, role: "admin" }, error: null });
    expect((await requireAccount("/admin", true)).profile?.role).toBe("admin");
  });

  it("reports a missing profile without replacing it with demo identity", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const account = await requireAccount("/dashboard");
    expect(account.profile).toBeNull();
    expect(account.profileError).toContain("Chưa có hồ sơ");
    await expect(requireAccount("/admin", true)).rejects.toThrow("not-found");
  });

  it.each(["database", "network", "wrong-id", "invalid-role", "invalid-date"]) ("fails closed for %s profile errors", async (failure) => {
    if (failure === "network") mocks.maybeSingle.mockRejectedValue(new Error("private detail"));
    else mocks.maybeSingle.mockResolvedValue({
      data: { ...memberProfile, ...(failure === "wrong-id" ? { id: "someone-else" } : {}), ...(failure === "invalid-role" ? { role: "owner" } : {}), ...(failure === "invalid-date" ? { created_at: "invalid" } : {}) },
      error: failure === "database" ? new Error("private detail") : null,
    });
    const account = await getAccount();
    expect(account.profile).toBeNull();
    expect(account.profileError).toBe("Không thể tải hồ sơ. Vui lòng thử lại sau.");
    await expect(requireAccount("/admin", true)).rejects.toThrow("not-found");
  });
});
