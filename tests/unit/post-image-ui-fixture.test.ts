import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

it.each([
  ["wrong project", { SUPABASE_TEST_PROJECT_REF: "aaaaaaaaaaaaaaaaaaaa", SUPABASE_TEST_URL: "https://aaaaaaaaaaaaaaaaaaaa.supabase.co" }, "Only the named UniLost test project"],
  ["remote app", { B1F_APP_ORIGIN: "https://example.com" }, "local test app"],
  ["invalid port", { B1F_FIXTURE_PORT: "NaN" }, "Number.isInteger"],
])("fixture bridge rejects %s before creating files or contacting Auth", (_label, overrides, expected) => {
  const output = join(tmpdir(), `unilost-rejected-fixture-${randomUUID()}`);
  const result = spawnSync(process.execPath, ["scripts/post-image-ui-fixture.mjs"], {
    encoding: "utf8",
    env: { ...process.env, SUPABASE_TEST_PROJECT_REF: "lsaukzzmwbsztnlcrdpk", SUPABASE_TEST_URL: "https://lsaukzzmwbsztnlcrdpk.supabase.co",
      SUPABASE_TEST_ANON_KEY: "dummy-public", SUPABASE_TEST_SERVICE_ROLE_KEY: "dummy-service",
      B1F_APP_ORIGIN: "http://localhost:5194", B1F_FIXTURE_PORT: "5195", B1F_OUTPUT: output, ...overrides },
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain(expected);
  expect(existsSync(output)).toBe(false);
});
