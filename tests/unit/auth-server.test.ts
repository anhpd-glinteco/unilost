import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { createSupabaseServerClient, getSupabaseUser } from "@/lib/supabase/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getAll: vi.fn(() => [{ name: "session", value: "untrusted" }]),
  set: vi.fn(),
  headers: vi.fn(async () => new Headers({ "oai-authenticated-user-id": "external-user", "oai-authenticated-user-email": "external@example.test" })),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: mocks.getAll, set: mocks.set }), headers: mocks.headers }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
  vi.mocked(createServerClient).mockReset().mockImplementation(() => ({ auth: { getUser: mocks.getUser } }) as ReturnType<typeof createServerClient>);
  mocks.getUser.mockReset();
  mocks.set.mockReset();
});

function cookieAdapter() {
  return vi.mocked(createServerClient).mock.calls.at(-1)![2].cookies as CookieMethodsServer;
}

describe("server Supabase session", () => {
  it("returns no business identity without configuration, even with external auth headers", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await getSupabaseUser()).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
    expect(mocks.headers).not.toHaveBeenCalled();
  });

  it("returns only the user verified by Auth", async () => {
    const user = { id: "verified-user", email: "member@example.test" };
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    expect(await getSupabaseUser()).toEqual(user);
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it("rejects an invalid or revoked session rather than trusting cookie user data", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "forged" } }, error: new Error("invalid token") });
    expect(await getSupabaseUser()).toBeNull();
  });

  it("creates a new client per request and persists cookie changes", async () => {
    await createSupabaseServerClient();
    const first = cookieAdapter();
    expect(first.getAll()).toEqual([{ name: "session", value: "untrusted" }]);
    first.setAll!([{ name: "session", value: "refreshed", options: { path: "/" } }], {});
    expect(mocks.set).toHaveBeenCalledWith("session", "refreshed", { path: "/" });
    await createSupabaseServerClient();
    expect(createServerClient).toHaveBeenCalledTimes(2);
    expect(cookieAdapter()).not.toBe(first);
  });

  it("does not hide cookie write failures during callback or logout", async () => {
    await createSupabaseServerClient();
    mocks.set.mockImplementation(() => { throw new Error("write failed"); });
    expect(() => cookieAdapter().setAll!([{ name: "session", value: "", options: {} }], {})).toThrow("write failed");
  });

  it("allows read-only server rendering after proxy refresh", async () => {
    await createSupabaseServerClient(true);
    mocks.set.mockImplementation(() => { throw new Error("read only"); });
    expect(() => cookieAdapter().setAll!([{ name: "session", value: "", options: {} }], {})).not.toThrow();
  });
});
