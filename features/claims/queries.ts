import { z } from "zod";
import { getAccount } from "@/lib/auth/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const claimSchema = z.object({ id: z.string().uuid(), status: z.enum(["pending", "accepted", "rejected", "cancelled", "completed"]) });
const listedClaimSchema = claimSchema.extend({
  post_id: z.string().uuid(), requester_id: z.string().uuid(), proof: z.string(),
  created_at: z.string().datetime({ offset: true }),
  posts: z.object({ id: z.string().uuid(), owner_id: z.string().uuid(), title: z.string().min(1), deleted_at: z.string().datetime({ offset: true }).nullable() }).nullable(),
});
export type ListedClaim = z.infer<typeof listedClaimSchema>;
export type ClaimListResult = { kind: "error" } | { kind: "ready"; claims: ListedClaim[]; hasNext: boolean };
export type ClaimListGroup = "sent" | "received";
export const claimsPageSize = 20;

export function parseClaimsPage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page * claimsPageSize <= 2147483647 ? page : 1;
}

export async function readClaimList(group: ClaimListGroup, page: number): Promise<ClaimListResult> {
  try {
    const account = await getAccount();
    if (!account.user || !account.profile || parseClaimsPage(String(page)) !== page) return { kind: "error" };
    const client = await createSupabaseServerClient(true);
    if (!client) return { kind: "error" };
    const relation = group === "received" ? "posts!inner" : "posts";
    const query = client.from("claim_requests")
      .select(`id,post_id,requester_id,proof,status,created_at,${relation}(id,owner_id,title,deleted_at)`);
    const filtered = group === "received" ? query.eq("posts.owner_id", account.user.id) : query.eq("requester_id", account.user.id);
    const start = (page - 1) * claimsPageSize;
    const result = await filtered.order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, start + claimsPageSize);
    if (result.error) return { kind: "error" };
    const rows = z.array(listedClaimSchema).safeParse(result.data);
    if (!rows.success || rows.data.some(row =>
      (row.posts && row.posts.id !== row.post_id) ||
      (group === "sent" ? row.requester_id !== account.user.id : row.posts?.owner_id !== account.user.id))) return { kind: "error" };
    return { kind: "ready", claims: rows.data.slice(0, claimsPageSize), hasNext: rows.data.length > claimsPageSize };
  } catch { return { kind: "error" }; }
}
export type ClaimFormContext =
  | { kind: "guest" | "unavailable" | "error" | "ready" }
  | { kind: "existing"; claim: z.infer<typeof claimSchema> };

export async function readClaimFormContext(postId: string): Promise<ClaimFormContext> {
  try {
    if (!z.string().uuid().safeParse(postId).success) return { kind: "error" };
    const account = await getAccount();
    if (!account.user) return { kind: "guest" };
    if (!account.profile) return { kind: "error" };
    const client = await createSupabaseServerClient(true);
    if (!client) return { kind: "error" };
    const existing = await client.from("claim_requests").select("id,status")
      .eq("post_id", postId).eq("requester_id", account.user.id).maybeSingle();
    if (existing.error) return { kind: "error" };
    if (existing.data) {
      const claim = claimSchema.safeParse(existing.data);
      return claim.success ? { kind: "existing", claim: claim.data } : { kind: "error" };
    }
    const result = await client.from("posts").select("owner_id,type,status,moderation,deleted_at").eq("id", postId).maybeSingle();
    const post = z.object({ owner_id: z.string().uuid(), type: z.enum(["found", "lost"]), status: z.string(), moderation: z.string(), deleted_at: z.string().nullable() }).safeParse(result.data);
    if (result.error || !post.success) return { kind: "error" };
    const eligible = post.data.owner_id !== account.user.id && post.data.type === "found"
      && post.data.moderation === "published" && post.data.deleted_at === null
      && ["searching", "matched"].includes(post.data.status);
    return { kind: eligible ? "ready" : "unavailable" };
  } catch { return { kind: "error" }; }
}
