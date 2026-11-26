"use server";

import { z } from "zod";
import { getAccount } from "@/lib/auth/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { foundPostSchema } from "./schemas";

export type CreatePostState = { error: string; postId: string | null };

export async function createFoundPost(_previous: CreatePostState, values: FormData): Promise<CreatePostState> {
  try {
    const account = await getAccount();
    if (!account.user) return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", postId: null };
    if (!account.profile) return { error: "Không thể tải hồ sơ. Vui lòng thử lại sau.", postId: null };
    const input = foundPostSchema.safeParse({
      type: "found", title: values.get("title"), category: values.get("category"),
      color: values.get("color"), description: values.get("description"),
      location: values.get("location"), occurredAt: values.get("occurredAt"),
    });
    if (!input.success) return { error: "Vui lòng kiểm tra nội dung và ngày nhặt được đồ.", postId: null };
    const { occurredAt, ...content } = input.data;
    const client = await createSupabaseServerClient();
    const result = await client?.from("posts").insert({
      ...content, owner_id: account.user.id, occurred_at: occurredAt,
    }).select("id").single();
    const id = z.string().uuid().safeParse(result?.data?.id);
    if (!result || result.error || !id.success) throw new Error("Post not confirmed");
    return { error: "", postId: id.data };
  } catch {
    return { error: "Không thể tạo tin. Vui lòng thử lại sau.", postId: null };
  }
}
