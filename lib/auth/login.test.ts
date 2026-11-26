import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendLoginLink } from "./login";

const auth = vi.hoisted(() => ({ signInWithOtp: vi.fn(), configured: true }));
vi.mock("@/lib/supabase", () => ({
  get supabase() { return auth.configured ? { auth } : null; },
}));

beforeEach(() => {
  auth.configured = true;
  auth.signInWithOtp.mockReset().mockResolvedValue({ error: null });
});

describe("sendLoginLink", () => {
  it("fails without configuration instead of reporting email sent", async () => {
    auth.configured = false;
    await expect(sendLoginLink("member@example.test", "https://unilost.test", "/")).rejects.toThrow("chưa được cấu hình");
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("validates email before contacting the provider", async () => {
    await expect(sendLoginLink("invalid", "https://unilost.test", "/")).rejects.toThrow("email hợp lệ");
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it.each(["/dashboard", "https://evil.example"]) ("sends a PKCE callback with safe next for %s", async (next) => {
    await sendLoginLink(" member@example.test ", "https://unilost.test", next);
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "member@example.test",
      options: { emailRedirectTo: `https://unilost.test/auth/callback?next=${encodeURIComponent(next === "/dashboard" ? next : "/")}` },
    });
  });

  it.each(["provider", "network"]) ("reports %s failure without leaking provider details", async (failure) => {
    if (failure === "provider") auth.signInWithOtp.mockResolvedValue({ error: { message: "sensitive provider detail" } });
    else auth.signInWithOtp.mockRejectedValue(new Error("sensitive provider detail"));
    await expect(sendLoginLink("member@example.test", "https://unilost.test", "/")).rejects.toThrow("Không thể gửi link");
  });
});
