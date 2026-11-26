import { z } from "zod";
import { getAccount } from "@/lib/auth/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const claimSchema = z.object({ id: z.string().uuid(), status: z.enum(["pending", "accepted", "rejected", "cancelled", "completed"]) });
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
