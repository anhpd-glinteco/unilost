"use server";
import { z } from "zod";
import { getAccount } from "@/lib/auth/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type ModerationState = { error: string; postId: string | null };
export async function moderatePost(_previous: ModerationState, values: FormData): Promise<ModerationState> {
  const failed = { error: "Chưa xác nhận được kết quả. Tải lại trạng thái trước khi thao tác tiếp.", postId: null };
  try {
    const account = await getAccount();
    if (!account.user || account.profile?.role !== "admin") return failed;
    const input = z.object({ postId: z.string().uuid(), action: z.enum(["publish", "hide", "restore"]) }).safeParse({ postId: values.get("postId"), action: values.get("action") });
    if (!input.success) return failed;
    const client = await createSupabaseServerClient();
    const result = await client?.rpc("moderate_post", { p_post_id: input.data.postId, p_action: input.data.action });
    if (!result || result.error || result.data !== input.data.postId) return failed;
    return { error: "", postId: input.data.postId };
  } catch { return failed; }
}
