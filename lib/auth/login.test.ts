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
  it("registers with a trimmed name and no client-supplied role", async () => {
    await sendLoginLink(" member@example.test ", "https://unilost.test", "/dashboard", " Nguyễn Minh Anh ");
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "member@example.test",
      options: { emailRedirectTo: "https://unilost.test/auth/callback?next=%2Fdashboard", data: { full_name: "Nguyễn Minh Anh" } },
    });
  });

  it.each(["", "   ", "a".repeat(101)])("rejects invalid registration name %s before contacting Auth", async (name) => {
    await expect(sendLoginLink("member@example.test", "https://unilost.test", "/dashboard", name)).rejects.toThrow("họ tên");
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("does not report registration success without configuration", async () => {
    auth.configured = false;
    await expect(sendLoginLink("member@example.test", "https://unilost.test", "/dashboard", "Member")).rejects.toThrow("chưa được cấu hình");
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it.each(["provider", "network"]) ("reports registration %s failures safely", async (failure) => {
    if (failure === "provider") auth.signInWithOtp.mockResolvedValue({ error: { message: "private detail" } });
    else auth.signInWithOtp.mockRejectedValue(new Error("private detail"));
    await expect(sendLoginLink("member@example.test", "https://unilost.test", "/dashboard", "Member")).rejects.toThrow("Không thể gửi link");
  });

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
