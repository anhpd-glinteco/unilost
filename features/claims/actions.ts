"use server";

import { z } from "zod";
import { getAccount } from "@/lib/auth/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { claimSchema } from "@/lib/validation";
import type { ClaimStatus } from "@/lib/types";

export type ClaimState = { error: string; claimId: string | null; status: ClaimStatus | null };
const claimResult = z.object({ id: z.string().uuid(), status: z.enum(["pending", "accepted", "rejected", "cancelled", "completed"]) });

async function mutateClaim(values: FormData, operation: "create" | "cancel" | "accept" | "reject"): Promise<ClaimState> {
  const create = operation === "create";
  const decide = operation === "accept" || operation === "reject";
  const failed: ClaimState = { error: "Chưa xác nhận được kết quả. Vui lòng tải lại trạng thái trước khi thử lại.", claimId: null, status: null };
  try {
    const account = await getAccount();
    if (!account.user) return { ...failed, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    if (!account.profile) return { ...failed, error: "Không thể tải hồ sơ. Vui lòng thử lại sau." };
    const id = z.string().uuid().safeParse(values.get(create ? "postId" : "claimId"));
    const proof = create ? claimSchema.safeParse({ proof: values.get("proof") }) : null;
    if (!id.success || (create && !proof?.success)) return { ...failed, error: "Vui lòng kiểm tra mã tin/yêu cầu và bằng chứng (10–1.000 ký tự)." };
    const client = await createSupabaseServerClient();
    if (!client) return failed;
    try {
      const result = create
        ? await client.rpc("create_claim", { p_post_id: id.data, p_proof: proof?.success ? proof.data.proof : "" })
        : await client.rpc(`${operation}_claim`, { p_claim_id: id.data });
      const returned = z.string().uuid().safeParse(result.data);
      if (!result.error && returned.success && (create || returned.data === id.data)) {
        const status = { create: "pending", cancel: "cancelled", accept: "accepted", reject: "rejected" } as const;
        return { error: "", claimId: returned.data, status: status[operation] };
      }
    } catch { /* A lost response can follow a committed transaction; read back before retrying. */ }
    const query = decide
      ? client.from("claim_requests").select("id,status,posts!inner(owner_id)").eq("posts.owner_id", account.user.id)
      : client.from("claim_requests").select("id,status").eq("requester_id", account.user.id);
    const read = await query.eq(create ? "post_id" : "id", id.data).maybeSingle();
    const existing = claimResult.safeParse(read.data);
    if (!read.error && existing.success) {
      return { error: "Yêu cầu đã có trạng thái được xác nhận; thao tác vừa gửi chưa được xác nhận thành công.", claimId: existing.data.id, status: existing.data.status };
    }
    return failed;
  } catch { return failed; }
}

export async function createClaim(_previous: ClaimState, values: FormData): Promise<ClaimState> {
  return mutateClaim(values, "create");
}

export async function cancelClaim(_previous: ClaimState, values: FormData): Promise<ClaimState> {
  return mutateClaim(values, "cancel");
}

export async function acceptClaim(_previous: ClaimState, values: FormData): Promise<ClaimState> {
  return mutateClaim(values, "accept");
}

export async function rejectClaim(_previous: ClaimState, values: FormData): Promise<ClaimState> {
  return mutateClaim(values, "reject");
}
