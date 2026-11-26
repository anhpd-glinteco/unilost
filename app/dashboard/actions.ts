"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getSupabaseUser } from "@/lib/supabase/server";

const profileInput = z.object({
  full_name: z.string().trim().min(1).max(100),
  faculty: z.string().trim().max(100).transform((value) => value || null),
});

export type ProfileState = { error: string; saved: boolean };

export async function updateProfile(_previous: ProfileState, values: FormData): Promise<ProfileState> {
  if (process.env.SUPABASE_PROFILE_EDIT_ENABLED !== "true") {
    return { error: "Hồ sơ đang chỉ đọc. Vui lòng thử lại sau.", saved: false };
  }
  try {
    const user = await getSupabaseUser();
    if (!user) return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", saved: false };
    const input = profileInput.safeParse({ full_name: values.get("full_name"), faculty: values.get("faculty") ?? "" });
    if (!input.success) return { error: "Tên cần có 1–100 ký tự; khoa tối đa 100 ký tự.", saved: false };
    const client = await createSupabaseServerClient();
    const result = await client?.from("profiles").update(input.data).eq("id", user.id)
      .select("id,full_name,faculty").maybeSingle();
    if (!result || result.error || result.data?.id !== user.id
      || result.data.full_name !== input.data.full_name || result.data.faculty !== input.data.faculty) {
      return { error: "Không thể lưu hồ sơ. Vui lòng thử lại sau.", saved: false };
    }
  } catch {
    return { error: "Không thể lưu hồ sơ. Vui lòng thử lại sau.", saved: false };
  }
  revalidatePath("/", "layout");
  return { error: "", saved: true };
}
