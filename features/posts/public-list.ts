import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const POST_PAGE_SIZE = 20;
const filtersSchema = z.object({
  q: z.string().trim().max(120).refine(value => !value.includes("\0")).default(""),
  type: z.enum(["all", "lost", "found"]).default("all"),
  category: z.string().trim().max(100).default(""),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  page: z.string().regex(/^[1-9]\d{0,5}$/).default("1").transform(Number),
});
export type PostFilters = z.output<typeof filtersSchema>;
export function parsePostFilters(params: Record<string, string | string[] | undefined>) {
  return filtersSchema.safeParse({ q: params.q, type: params.type, category: params.category, sort: params.sort, page: params.page });
}
export function postListHref(filters: PostFilters, page: number) {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.type !== "all") query.set("type", filters.type);
  if (filters.category) query.set("category", filters.category);
  if (filters.sort !== "newest") query.set("sort", filters.sort);
  if (page > 1) query.set("page", String(page));
  return `/posts${query.size ? `?${query}` : ""}`;
}
const rowSchema = z.object({
  id: z.string().uuid(), type: z.enum(["lost", "found"]), title: z.string().min(1),
  category: z.string().min(1), color: z.string(), location: z.string(),
  created_at: z.string().datetime({ offset: true }), moderation: z.literal("published"), deleted_at: z.null(),
});
export type PublicPostCard = { id: string; type: "lost" | "found"; title: string; category: string; color: string; location: string; createdAt: string; emoji: string };
export type PublicPostList = { kind: "ok"; posts: PublicPostCard[]; count: number } | { kind: "error" };

export async function readPublicPosts(filters: PostFilters): Promise<PublicPostList> {
  // Revalidate at the query boundary, including callers other than the page.
  const parsed = filtersSchema.safeParse({ ...filters, page: String(filters.page) });
  if (!parsed.success) return { kind: "error" };
  const input = parsed.data;
  try {
    const client = await createSupabaseServerClient(true);
    if (!client) return { kind: "error" };
    let query = client.from("posts").select("id,type,title,category,color,location,created_at,moderation,deleted_at", { count: "exact" })
      .eq("moderation", "published").is("deleted_at", null);
    if (input.type !== "all") query = query.eq("type", input.type);
    if (input.category) query = query.eq("category", input.category);
    if (input.q) {
      // Quote PostgREST operands and escape LIKE wildcards so user text stays literal.
      const like = `%${input.q.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&")}%`;
      const pattern = like.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      query = query.or(["title", "description", "location"].map(column => `${column}.ilike."${pattern}"`).join(","));
    }
    const ascending = input.sort === "oldest";
    const first = (input.page - 1) * POST_PAGE_SIZE;
    const result = await query.order("created_at", { ascending }).order("id", { ascending }).range(first, first + POST_PAGE_SIZE - 1);
    if (result.error || !Number.isSafeInteger(result.count) || result.count! < 0) return { kind: "error" };
    const rows = z.array(rowSchema).max(POST_PAGE_SIZE).safeParse(result.data);
    if (!rows.success) return { kind: "error" };
    return { kind: "ok", count: result.count!, posts: rows.data.map(row => ({
      id: row.id, type: row.type, title: row.title, category: row.category, color: row.color,
      location: row.location, createdAt: row.created_at, emoji: "📦",
    })) };
  } catch { return { kind: "error" }; }
}
