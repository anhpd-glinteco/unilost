import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccount } from "@/lib/auth/account";

export async function canManagePost(id: string) {
  if (!z.string().uuid().safeParse(id).success) return false;
  try {
    const account = await getAccount();
    if (!account.user || !account.profile) return false;
    const client = await createSupabaseServerClient(true);
    const result = await client?.from("posts").select("id")
      .eq("id", id).eq("owner_id", account.user.id).is("deleted_at", null).maybeSingle();
    return !!result && !result.error && result.data?.id === id.toLowerCase();
  } catch { return false; }
}

const postDetailSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["lost", "found"]),
  title: z.string().min(1),
  category: z.string().min(1),
  color: z.string().min(1),
  description: z.string().min(1),
  location: z.string().min(1),
  occurred_at: z.string().date(),
  status: z.enum(["searching", "matched", "verifying", "returned", "closed"]),
  moderation: z.enum(["published", "pending", "hidden"]),
  deleted_at: z.string().datetime({ offset: true }).nullable(),
});

export async function readPost(id: string) {
  if (!z.string().uuid().safeParse(id).success) return { kind: "missing" } as const;
  try {
    const client = await createSupabaseServerClient(true);
    if (!client) return { kind: "error" } as const;
    const { data, error } = await client.from("posts")
      .select("id,type,title,category,color,description,location,occurred_at,status,moderation,deleted_at")
      .eq("id", id).is("deleted_at", null).maybeSingle();
    if (error) return { kind: "error" } as const;
    if (!data) return { kind: "missing" } as const;
    const post = postDetailSchema.safeParse(data);
    if (!post.success || post.data.id.toLowerCase() !== id.toLowerCase()) return { kind: "error" } as const;
    if (post.data.deleted_at) return { kind: "missing" } as const;
    return { kind: "found", post: post.data } as const;
  } catch {
    return { kind: "error" } as const;
  }
}
