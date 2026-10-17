import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { safeAuthReturnPath } from "./return-path";

export async function sendLoginLink(email: string, origin: string, returnTo: string, fullName?: string) {
  if (!supabase) throw new Error("Đăng nhập chưa được cấu hình. Vui lòng thử lại sau.");
  const parsed = z.string().trim().email().safeParse(email);
  if (!parsed.success) throw new Error("Vui lòng nhập email hợp lệ.");

  const name = fullName === undefined ? undefined : z.string().trim().min(1).max(100).safeParse(fullName);
  if (name && !name.success) throw new Error("Vui lòng nhập họ tên từ 1 đến 100 ký tự.");

  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeAuthReturnPath(returnTo));
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: callback.toString(), ...(name?.success ? { data: { full_name: name.data } } : {}) },
    });
    if (!error) return;
  } catch {
    // Provider and network failures share a safe message without logging auth data.
  }
  throw new Error("Không thể gửi link đăng nhập. Vui lòng thử lại sau.");
}
