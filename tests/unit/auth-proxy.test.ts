import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
  auth.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
  vi.mocked(createServerClient).mockReset().mockReturnValue({ auth } as unknown as ReturnType<typeof createServerClient>);
});

describe("session refresh proxy", () => {
  it.each(["missing config", "callback"]) ("skips refresh for %s", async (reason) => {
    if (reason === "missing config") vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await proxy(new NextRequest(`https://unilost.test/${reason === "callback" ? "auth/callback?code=test" : "posts"}`));
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("forwards refreshed cookies to rendering and the browser without caching them", async () => {
    const request = new NextRequest("https://unilost.test/auth/login", { headers: { cookie: "session=old" } });
    auth.getUser.mockImplementation(async () => {
      const adapter = vi.mocked(createServerClient).mock.calls[0][2].cookies as CookieMethodsServer;
      expect(adapter.getAll()).toEqual([{ name: "session", value: "old" }]);
      adapter.setAll!([{ name: "session", value: "new", options: { path: "/", sameSite: "lax" } }], {
        "Cache-Control": "private, no-store", Expires: "0", Pragma: "no-cache",
      });
      return { data: { user: { id: "verified-user" } }, error: null };
    });
    const response = await proxy(request);
    expect(auth.getUser).toHaveBeenCalledOnce();
    expect(request.cookies.get("session")?.value).toBe("new");
    expect(response.cookies.get("session")?.value).toBe("new");
    expect(response.headers.get("x-middleware-request-cookie")).toBe("session=new");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});
