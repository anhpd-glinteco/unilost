import { describe, expect, it } from "vitest";
import { assertDenied, assertStorageDenied, testConfig } from "../../scripts/test-permissions.mjs";

const env = {
  SUPABASE_TEST_PROJECT_REF: "a".repeat(20),
  SUPABASE_TEST_URL: `https://${"a".repeat(20)}.supabase.co`,
  SUPABASE_TEST_ANON_KEY: "public-test-key",
  SUPABASE_TEST_SERVICE_ROLE_KEY: "service-test-key",
};
describe("permission runner safeguards", () => {
  it("requires an explicit test target rather than using application env", () => {
    expect(() => testConfig({ NEXT_PUBLIC_SUPABASE_URL: env.SUPABASE_TEST_URL })).toThrow();
    expect(testConfig(env).url).toBe(env.SUPABASE_TEST_URL);
  });
  it.each([
    { SUPABASE_TEST_PROJECT_REF: "" }, { SUPABASE_TEST_SERVICE_ROLE_KEY: "" },
    { SUPABASE_TEST_ANON_KEY: "service-test-key" },
    { SUPABASE_TEST_URL: "https://production.supabase.co" },
    { SUPABASE_TEST_URL: env.SUPABASE_TEST_URL + "/?secret=value" },
  ])("refuses missing or mismatched configuration", (change) => {
    expect(() => testConfig({ ...env, ...change })).toThrow();
  });
  it("accepts permission denial and RLS zero-row updates, rejects false positives", () => {
    expect(() => assertDenied(new Response(null, { status: 403 }), {}, "POST")).not.toThrow();
    expect(() => assertDenied(new Response(null, { status: 200 }), [], "PATCH")).not.toThrow();
    expect(() => assertDenied(new Response(null, { status: 201 }), [], "POST")).toThrow();
    expect(() => assertDenied(new Response(null, { status: 200 }), [{ id: "changed" }], "PATCH")).toThrow();
    expect(() => assertDenied(new Response(null, { status: 409 }), {}, "POST")).toThrow();
    expect(() => assertDenied(new Response(null, { status: 500 }), {}, "PATCH")).toThrow();
  });
  it("recognizes Storage permission errors wrapped in HTTP 400 and zero-row deletes", () => {
    expect(() => assertStorageDenied(new Response(null, { status: 400 }), { statusCode: "403" }, "POST")).not.toThrow();
    expect(() => assertStorageDenied(new Response(null, { status: 200 }), [], "DELETE")).not.toThrow();
    expect(() => assertStorageDenied(new Response(null, { status: 404 }), { statusCode: "404" }, "DELETE")).toThrow();
    expect(() => assertStorageDenied(new Response(null, { status: 400 }), { statusCode: "400" }, "POST")).toThrow();
  });
});
