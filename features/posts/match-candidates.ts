import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";
const rowSchema = z.object({
  id: z.string().uuid(), type: z.enum(["lost", "found"]), title: z.string().min(1),
  category: z.string().min(1), color: z.string(), description: z.string(), location: z.string(),
  occurred_at: z.string().date(), created_at: z.string().datetime({ offset: true }),
  status: z.enum(["searching", "matched", "verifying", "returned", "closed"]),
  moderation: z.enum(["published", "pending", "hidden"]), deleted_at: z.null(),
});
const projection = "id,type,title,category,color,description,location,occurred_at,created_at,status,moderation,deleted_at";
type CandidatePost = Omit<Post, "ownerName" | "ownerId" | "imageUrl">;
export type MatchCandidateRead = { kind: "ok"; source: CandidatePost; posts: CandidatePost[] } | { kind: "missing" | "error" };
function mapPost(row: z.infer<typeof rowSchema>): CandidatePost {
  return { id: row.id, type: row.type, title: row.title, category: row.category, color: row.color,
    description: row.description, location: row.location, occurredAt: row.occurred_at,
    createdAt: row.created_at, status: row.status, moderation: row.moderation, emoji: "📦" };
}
export async function readMatchCandidates(id: string): Promise<MatchCandidateRead> {
  if (!z.string().uuid().safeParse(id).success) return { kind: "missing" };
  try {
    const client = await createSupabaseServerClient(true);
    if (!client) return { kind: "error" };
    const result = await client.from("posts").select(projection).eq("id", id).is("deleted_at", null).maybeSingle();
    if (result.error) return { kind: "error" };
    if (!result.data) return { kind: "missing" };
    const source = rowSchema.safeParse(result.data);
    if (!source.success || source.data.id.toLowerCase() !== id.toLowerCase()) return { kind: "error" };
    if (!["searching", "matched"].includes(source.data.status)) return { kind: "ok", source: mapPost(source.data), posts: [] };
    const posts: CandidatePost[] = [];
    let after: string | undefined;
    // shortcut: batches are not a DB snapshot; use a snapshot RPC if concurrent edits require consistent ranking.
    while (true) {
      let query = client.from("posts").select(projection).eq("type", source.data.type === "lost" ? "found" : "lost")
        .eq("moderation", "published").is("deleted_at", null).in("status", ["searching", "matched"]);
      if (after) query = query.gt("id", after);
      const batch = await query.order("id", { ascending: true }).range(0, 199);
      if (batch.error) return { kind: "error" };
      const parsed = z.array(rowSchema).max(200).safeParse(batch.data);
      if (!parsed.success) return { kind: "error" };
      for (const row of parsed.data) {
        if (row.id === source.data.id || row.type === source.data.type || row.moderation !== "published" || !["searching", "matched"].includes(row.status) || (after && row.id <= after)) return { kind: "error" };
        posts.push(mapPost(row)); after = row.id;
      }
      if (parsed.data.length < 200) return { kind: "ok", source: mapPost(source.data), posts };
    }
  } catch { return { kind: "error" }; }
}
