"use server";

import { z } from "zod";
import { getAccount } from "@/lib/auth/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { claimSchema } from "@/lib/validation";
import type { ClaimStatus } from "@/lib/types";

export type ClaimState = { error: string; claimId: string | null; status: ClaimStatus | null };
const claimResult = z.object({ id: z.string().uuid(), status: z.enum(["pending", "accepted", "rejected", "cancelled", "completed"]) });

async function mutateClaim(values: FormData, cancel: boolean): Promise<ClaimState> {
  const failed: ClaimState = { error: "Chưa xác nhận được kết quả. Vui lòng tải lại trạng thái trước khi thử lại.", claimId: null, status: null };
  try {
    const account = await getAccount();
    if (!account.user) return { ...failed, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    if (!account.profile) return { ...failed, error: "Không thể tải hồ sơ. Vui lòng thử lại sau." };
    const id = z.string().uuid().safeParse(values.get(cancel ? "claimId" : "postId"));
    const proof = cancel ? null : claimSchema.safeParse({ proof: values.get("proof") });
    if (!id.success || (!cancel && !proof?.success)) return { ...failed, error: "Vui lòng kiểm tra mã tin/yêu cầu và bằng chứng (10–1.000 ký tự)." };
    const client = await createSupabaseServerClient();
    if (!client) return failed;
    try {
      const result = cancel
        ? await client.rpc("cancel_claim", { p_claim_id: id.data })
        : await client.rpc("create_claim", { p_post_id: id.data, p_proof: proof?.success ? proof.data.proof : "" });
      const returned = z.string().uuid().safeParse(result.data);
      if (!result.error && returned.success && (!cancel || returned.data === id.data)) {
        return { error: "", claimId: returned.data, status: cancel ? "cancelled" : "pending" };
      }
    } catch { /* A lost response can follow a committed transaction; read back before retrying. */ }
    const query = client.from("claim_requests").select("id,status").eq("requester_id", account.user.id);
    const read = await (cancel ? query.eq("id", id.data) : query.eq("post_id", id.data)).maybeSingle();
    const existing = claimResult.safeParse(read.data);
    if (!read.error && existing.success) {
      return { error: "Yêu cầu đã có trạng thái được xác nhận; thao tác vừa gửi chưa được xác nhận thành công.", claimId: existing.data.id, status: existing.data.status };
    }
    return failed;
  } catch { return failed; }
}

export async function createClaim(_previous: ClaimState, values: FormData): Promise<ClaimState> {
  return mutateClaim(values, false);
}

export async function cancelClaim(_previous: ClaimState, values: FormData): Promise<ClaimState> {
  return mutateClaim(values, true);
}
