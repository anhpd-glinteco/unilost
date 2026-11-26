"use server";

import { z } from "zod";
import { getAccount } from "@/lib/auth/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPostSchema } from "./schemas";

export type CreatePostState = { error: string; postId: string | null };

async function createPost(type: "lost" | "found", values: FormData): Promise<CreatePostState> {
  try {
    const account = await getAccount();
    if (!account.user) return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", postId: null };
    if (!account.profile) return { error: "Không thể tải hồ sơ. Vui lòng thử lại sau.", postId: null };
    const input = createPostSchema.safeParse({
      type, title: values.get("title"), category: values.get("category"),
      color: values.get("color"), description: values.get("description"),
      location: values.get("location"), occurredAt: values.get("occurredAt"),
    });
    if (!input.success) return {
      error: type === "found" ? "Vui lòng kiểm tra nội dung và ngày nhặt được đồ." : "Vui lòng kiểm tra nội dung và ngày thất lạc đồ.",
      postId: null,
    };
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

export async function createFoundPost(_previous: CreatePostState, values: FormData): Promise<CreatePostState> {
  return createPost("found", values);
}

export async function createLostPost(_previous: CreatePostState, values: FormData): Promise<CreatePostState> {
  return createPost("lost", values);
}
