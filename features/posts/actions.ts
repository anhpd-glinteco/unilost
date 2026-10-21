"use server";

import { z } from "zod";
import { getAccount } from "@/lib/auth/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPostSchema, updatePostSchema } from "./schemas";

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

export type PostMutationState = {
  error: string; postId: string | null; status: import("@/lib/types").PostStatus | null;
  moderation: import("@/lib/types").ModerationState | null;
};
const postResult = z.object({
  id: z.string().uuid(), status: z.enum(["searching", "matched", "verifying", "returned", "closed"]),
  moderation: z.enum(["pending", "published", "hidden"]),
});
async function mutatePost(values: FormData, operation: "update" | "close"): Promise<PostMutationState> {
  const failed: PostMutationState = { error: "Chưa xác nhận được kết quả. Vui lòng tải lại tin trước khi thử lại.", postId: null, status: null, moderation: null };
  try {
    const account = await getAccount();
    if (!account.user) return { ...failed, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    if (!account.profile) return { ...failed, error: "Không thể tải hồ sơ. Vui lòng thử lại sau." };
    const id = z.string().uuid().safeParse(values.get("postId"));
    const content = operation === "update" ? updatePostSchema.safeParse({
      title: values.get("title"), category: values.get("category"), color: values.get("color"),
      description: values.get("description"), location: values.get("location"), occurredAt: values.get("occurredAt"),
    }) : null;
    if (!id.success || (content && !content.success)) return { ...failed, error: "Vui lòng kiểm tra mã tin, nội dung và ngày xảy ra." };
    const client = await createSupabaseServerClient();
    if (!client) return failed;
    let confirmed = false;
    try {
      const result = operation === "update" && content?.success
        ? await client.rpc("update_post", { p_post_id: id.data, p_content: content.data })
        : await client.rpc("close_post", { p_post_id: id.data });
      confirmed = !result.error && result.data === id.data;
    } catch { /* A lost response may follow a committed write; read back without retrying. */ }
    const read = await client.from("posts").select("id,status,moderation").eq("id", id.data).eq("owner_id", account.user.id).is("deleted_at", null).maybeSingle();
    const current = postResult.safeParse(read.data);
    if (read.error || !current.success || current.data.id !== id.data) return failed;
    return { error: confirmed ? "" : failed.error, postId: current.data.id, status: current.data.status, moderation: current.data.moderation };
  } catch { return failed; }
}
export async function updatePost(_previous: PostMutationState, values: FormData): Promise<PostMutationState> {
  return mutatePost(values, "update");
}
export async function closePost(_previous: PostMutationState, values: FormData): Promise<PostMutationState> {
  return mutatePost(values, "close");
}
