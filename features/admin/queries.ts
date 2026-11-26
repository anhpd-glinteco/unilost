import { z } from "zod";
import { getAccount } from "@/lib/auth/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const moderationSchema = z.enum(["pending", "published", "hidden"]);
const postSchema = z.object({ id: z.string().uuid(), title: z.string(), moderation: moderationSchema, status: z.enum(["searching", "matched", "verifying", "returned", "closed"]), deleted_at: z.null() });
const auditSchema = z.object({ id: z.string().uuid(), post_id: z.string().uuid(), action: z.enum(["publish", "hide", "restore"]), created_at: z.string().datetime({ offset: true }) });
export async function readModeration(moderation: z.infer<typeof moderationSchema>, page: number) {
  try {
    const account = await getAccount();
    if (!account.user || account.profile?.role !== "admin" || !moderationSchema.safeParse(moderation).success || !Number.isInteger(page) || page < 1 || page > 100000) return null;
    const client = await createSupabaseServerClient(true);
    if (!client) return null;
    const result = await client.from("posts").select("id,title,moderation,status,deleted_at").eq("moderation", moderation).is("deleted_at", null).order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 20, page * 20);
    const posts = z.array(postSchema).safeParse(result.data);
    if (result.error || !posts.success || posts.data.some(post => post.moderation !== moderation)) return null;
    const audit = await client.from("moderation_actions").select("id,post_id,action,created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(20);
    const counts = await Promise.all(moderationSchema.options.map(async state => {
      const result = await client.from("posts").select("id", { count: "exact", head: true })
        .eq("moderation", state).is("deleted_at", null);
      return { state, total: result.error ? null : result.count };
    }));
    const parsedAudit = z.array(auditSchema).safeParse(audit.data);
    return { counts, posts: posts.data.slice(0, 20), hasNext: posts.data.length > 20, audit: !audit.error && parsedAudit.success ? parsedAudit.data : null };
  } catch { return null; }
}
