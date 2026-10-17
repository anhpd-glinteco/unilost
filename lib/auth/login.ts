import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { safeAuthReturnPath } from "./return-path";

export async function sendLoginLink(email: string, origin: string, returnTo: string) {
  if (!supabase) throw new Error("Đăng nhập chưa được cấu hình. Vui lòng thử lại sau.");
  const parsed = z.string().trim().email().safeParse(email);
  if (!parsed.success) throw new Error("Vui lòng nhập email hợp lệ.");

  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeAuthReturnPath(returnTo));
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: callback.toString() },
    });
    if (!error) return;
  } catch {
    // Provider and network failures share a safe message without logging auth data.
  }
  throw new Error("Không thể gửi link đăng nhập. Vui lòng thử lại sau.");
}
