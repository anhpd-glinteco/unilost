"use client";

import { useActionState, useRef, useState } from "react";
import { createClaim, type ClaimState } from "./actions";
import { claimSchema } from "@/lib/validation";
import { claimStatusLabels } from "./claim-status";

export function CreateClaimForm({ postId }: { postId: string }) {
  const [proof, setProof] = useState("");
  const [attempted, setAttempted] = useState(false);
  const submitted = useRef(false);
  const [state, action, pending] = useActionState(async (previous: ClaimState, values: FormData): Promise<ClaimState> => {
    if (submitted.current) return previous;
    const parsed = claimSchema.safeParse({ proof: values.get("proof") });
    if (!parsed.success) return { error: "Bằng chứng cần có 10–1.000 ký tự sau khi bỏ khoảng trắng đầu/cuối.", claimId: null, status: null };
    submitted.current = true;
    setAttempted(true);
    try { return await createClaim(previous, values); }
    catch { return { error: "Chưa xác nhận được kết quả. Vui lòng tải lại trạng thái trước khi thử lại.", claimId: null, status: null }; }
  }, { error: "", claimId: null, status: null });
  const locked = pending || attempted || !!state.claimId;
  return <form action={action} aria-busy={pending} className="mt-8 min-w-0 space-y-4 rounded-2xl border border-[#dfe9e2] bg-white p-6">
    <h2 className="text-xl font-semibold">Yêu cầu nhận đồ</h2>
    <p id="proof-help" className="text-sm text-[#5f746d]">Mô tả đặc điểm giúp xác minh món đồ thuộc về bạn (10–1.000 ký tự). Bằng chứng chỉ dành cho bạn, chủ tin và quản trị viên.</p>
    <input type="hidden" name="postId" value={postId} />
    <fieldset disabled={locked} className="min-w-0 space-y-4 disabled:opacity-60">
      <label htmlFor="claim-proof" className="block text-sm font-semibold">Bằng chứng nhận đồ</label>
      <textarea id="claim-proof" name="proof" required maxLength={1000} rows={4} aria-describedby="proof-help" value={proof} onChange={(event) => setProof(event.target.value)} className="w-full min-w-0 rounded-xl border border-[#dfe9e2] px-4 py-3" />
      <button className="w-full rounded-full bg-[#1c5546] px-5 py-3 font-bold text-white">{pending ? "Đang gửi…" : "Gửi yêu cầu nhận đồ"}</button>
    </fieldset>
    {!pending && state.error && <p role="alert" className="text-sm text-[#b65e2b]">{state.error}</p>}
    {state.claimId && state.status && <div role="status" className="space-y-2 text-sm text-[#28725c]">
      {!state.error && <p>Đã gửi yêu cầu nhận đồ.</p>}
      <p>Trạng thái: {claimStatusLabels[state.status]}</p><p className="break-all">Mã yêu cầu: {state.claimId}</p>
    </div>}
    {!pending && attempted && state.error && <a href={`/posts/${postId}`} className="inline-block text-sm underline">Tải lại trạng thái</a>}
  </form>;
}
