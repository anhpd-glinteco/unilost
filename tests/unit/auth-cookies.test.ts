import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseServerClient, getSupabaseUser } from "@/lib/supabase/server";

const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({ cookies: async () => ({
  getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  set: (name: string, value: string, options: { maxAge?: number }) => {
    if (options.maxAge === 0) jar.delete(name);
    else jar.set(name, value);
  },
}) }));

const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", email: "member@example.test" };
const storageKey = "sb-project-auth-token";
const now = () => Math.floor(Date.now() / 1000);
const token = () => [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ sub: user.id, exp: now() + 3600, iat: now(), role: "authenticated" })).toString("base64url"),
  "test-signature",
].join(".");

function session() {
  return { access_token: token(), refresh_token: "new-refresh-token", token_type: "bearer", expires_in: 3600, user };
}

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  jar.clear();
  fetchMock.mockReset();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("real Supabase SDK with simulated Auth HTTP responses", () => {
  it("exchanges PKCE, writes session cookies, reads the next request, and clears cookies on logout", async () => {
    jar.set(`${storageKey}-code-verifier`, JSON.stringify("test-verifier"));
    const issued = session();
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/token?grant_type=pkce")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ auth_code: "test-code", code_verifier: "test-verifier" });
        return Response.json(issued);
      }
      if (url.endsWith("/user")) {
        expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${issued.access_token}`);
        return Response.json(user);
      }
      if (url.endsWith("/logout?scope=local")) return new Response(null, { status: 204 });
      throw new Error(`Unexpected Auth request: ${url}`);
    });
    const client = (await createSupabaseServerClient())!;
    expect((await client.auth.exchangeCodeForSession("test-code")).error).toBeNull();
    expect(jar.has(storageKey)).toBe(true);
    expect(jar.has(`${storageKey}-code-verifier`)).toBe(false);
    expect(await getSupabaseUser()).toMatchObject({ id: user.id });
    const nextRequest = (await createSupabaseServerClient())!;
    expect((await nextRequest.auth.signOut({ scope: "local" })).error).toBeNull();
    expect(jar.has(storageKey)).toBe(false);
    expect(await getSupabaseUser()).toBeNull();
  });

  it("rejects forged cookie user data when Auth rejects the access token", async () => {
    jar.set(storageKey, JSON.stringify({ ...session(), expires_at: now() + 3600 }));
    fetchMock.mockResolvedValue(Response.json({ msg: "invalid token", code: "bad_jwt" }, { status: 401 }));
    expect(await getSupabaseUser()).toBeNull();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("refreshes an expired session and persists the new refresh token", async () => {
    jar.set(storageKey, JSON.stringify({ ...session(), refresh_token: "old-refresh-token", expires_at: now() - 60 }));
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).endsWith("/token?grant_type=refresh_token")) {
        expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: "old-refresh-token" });
        return Response.json(session());
      }
      if (String(input).endsWith("/user")) return Response.json(user);
      throw new Error("Unexpected Auth request");
    });
    const client = (await createSupabaseServerClient())!;
    expect((await client.auth.getUser()).data.user?.id).toBe(user.id);
    const stored = jar.get(storageKey)!;
    expect(stored.startsWith("base64-")).toBe(true);
    const refreshed = JSON.parse(Buffer.from(stored.slice(7), "base64url").toString());
    expect(refreshed.refresh_token).toBe("new-refresh-token");
    expect(refreshed.expires_at).toBeGreaterThan(now());
  });
});
