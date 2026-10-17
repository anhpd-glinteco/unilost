import { z } from "zod";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient, getSupabaseUser } from "@/lib/supabase/server";
import { safeAuthReturnPath } from "./return-path";

const profileSchema = z.object({
  id: z.string(),
  full_name: z.string().trim().min(1),
  faculty: z.string().nullable(),
  role: z.enum(["user", "admin"]),
  created_at: z.string().datetime({ offset: true }),
});

export async function getAccount() {
  const user = await getSupabaseUser();
  if (!user) return { user: null, profile: null, profileError: "" };
  try {
    const client = await createSupabaseServerClient(true);
    const result = await client?.from("profiles")
      .select("id,full_name,faculty,role,created_at").eq("id", user.id).maybeSingle();
    if (!result || result.error) throw new Error("profile unavailable");
    if (!result.data) return { user, profile: null, profileError: "Chưa có hồ sơ tài khoản. Vui lòng liên hệ quản trị viên." };
    const profile = profileSchema.safeParse(result.data);
    if (!profile.success || profile.data.id !== user.id) throw new Error("invalid profile");
    return { user, profile: profile.data, profileError: "" };
  } catch {
    return { user, profile: null, profileError: "Không thể tải hồ sơ. Vui lòng thử lại sau." };
  }
}

export async function requireAccount(returnTo: string, admin = false) {
  const account = await getAccount();
  if (!account.user) redirect(`/auth/login?next=${encodeURIComponent(safeAuthReturnPath(returnTo))}`);
  if (admin && account.profile?.role !== "admin") notFound();
  return account;
}
