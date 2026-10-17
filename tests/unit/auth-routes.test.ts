import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/auth/callback/route";
import { signOut } from "@/app/auth/actions";

const auth = vi.hoisted(() => ({
  configured: true, exchangeCodeForSession: vi.fn(), getUser: vi.fn(), signOut: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => auth.configured ? { auth } : null }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

beforeEach(() => {
  auth.configured = true;
  auth.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  auth.getUser.mockReset().mockResolvedValue({ data: { user: { id: "verified-user" } }, error: null });
  auth.signOut.mockReset().mockResolvedValue({ error: null });
});

describe("email callback", () => {
  it("exchanges the code and verifies the user before redirecting", async () => {
    const response = await GET(new Request("https://unilost.test/auth/callback?code=test-code&next=/dashboard"));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(auth.getUser).toHaveBeenCalledOnce();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://unilost.test/dashboard");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("does not redirect to an external destination", async () => {
    const response = await GET(new Request("https://unilost.test/auth/callback?code=test-code&next=//evil.example"));
    expect(response.headers.get("location")).toBe("https://unilost.test/");
  });

  it.each(["", "?error=access_denied&code=test-code"]) ("rejects missing code or provider error %s", async (query) => {
    const response = await GET(new Request(`https://unilost.test/auth/callback${query}`));
    expect(response.headers.get("location")).toBe("https://unilost.test/auth/login?error=callback");
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("reports invalid, expired, or reused links", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: new Error("expired") });
    const response = await GET(new Request("https://unilost.test/auth/callback?code=expired"));
    expect(response.headers.get("location")).toContain("error=callback");
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it.each(["revoked", "missing"]) ("rejects %s user after exchange", async (state) => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: state === "revoked" ? new Error("revoked") : null });
    const response = await GET(new Request("https://unilost.test/auth/callback?code=test-code"));
    expect(response.headers.get("location")).toContain("error=callback");
  });

  it("reports missing configuration", async () => {
    auth.configured = false;
    const response = await GET(new Request("https://unilost.test/auth/callback?code=test-code"));
    expect(response.headers.get("location")).toContain("error=configuration");
  });
});

describe("logout server action", () => {
  it("revokes the current session and redirects to login", async () => {
    await expect(signOut()).rejects.toThrow("redirect:/auth/login");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("reports provider failure without claiming success", async () => {
    auth.signOut.mockResolvedValue({ error: new Error("offline") });
    await expect(signOut()).rejects.toThrow("redirect:/auth/login?error=logout");
  });

  it("reports missing configuration", async () => {
    auth.configured = false;
    await expect(signOut()).rejects.toThrow("redirect:/auth/login?error=configuration");
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
