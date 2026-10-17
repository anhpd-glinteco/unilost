import { describe, expect, it } from "vitest";
import { safeAuthReturnPath } from "./return-path";

describe("safeAuthReturnPath", () => {
  it.each(["/dashboard", "/posts?type=found#results", "/posts/%C4%91%E1%BB%93"]) ("keeps internal destination %s", (path) => {
    expect(safeAuthReturnPath(path)).toBe(path);
  });

  it.each([
    undefined, null, "", ["/posts", "/admin"], "https://evil.example", "//evil.example",
    "/\\evil.example", "/\nevil.example", "/%2f%2fevil.example", "/%5cevil.example",
    "/a/..//evil.example", "/%0d%0aLocation:evil", "/%ZZ", "/auth/login", "/auth/callback?code=secret",
    "/%61uth/login", "/posts/../auth/login", "/signin-with-chatgpt", "/signout-with-chatgpt", "/callback",
  ])("rejects unsafe destination %s", (path) => {
    expect(safeAuthReturnPath(path)).toBe("/");
  });
});
