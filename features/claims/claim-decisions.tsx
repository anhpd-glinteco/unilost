"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { acceptClaim, cancelClaim, rejectClaim, type ClaimState } from "./actions";
import { claimStatusLabels } from "./claim-status";
import type { ClaimListGroup } from "./queries";
import type { ClaimStatus } from "@/lib/types";

const decisions = {
  cancel: { label: "Hủy yêu cầu", description: "Sau khi hủy, bạn không thể gửi lại yêu cầu cho tin này trong phiên bản hiện tại.", success: "Đã hủy yêu cầu.", action: cancelClaim },
  accept: { label: "Chấp nhận", description: "Tin sẽ chuyển sang xác minh. Các yêu cầu khác vẫn chờ xử lý nhưng không thể được chấp nhận tiếp. Bước này chưa xác nhận đã trả đồ.", success: "Đã chấp nhận yêu cầu. Tin đã chuyển sang xác minh.", action: acceptClaim },
  reject: { label: "Từ chối", description: "Sau khi từ chối, người gửi không thể gửi lại yêu cầu cho tin này trong phiên bản hiện tại.", success: "Đã từ chối yêu cầu.", action: rejectClaim },
};
type Decision = keyof typeof decisions;

export function ClaimDecisions({ claimId, status, group, canAccept }: { claimId: string; status: ClaimStatus; group: ClaimListGroup; canAccept: boolean }) {
  const router = useRouter();
  const submitted = useRef(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [operation, setOperation] = useState<Decision | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ClaimState | null>(null);
  const [success, setSuccess] = useState("");

  async function submit(decision: Decision) {
    if (submitted.current) return;
    submitted.current = true;
    setAttempted(true);
    setOperation(null);
    setPending(true);
    const values = new FormData();
    values.set("claimId", claimId);
    try {
      const next = await decisions[decision].action({ error: "", claimId: null, status: null }, values);
      setResult(next);
      if (!next.error && next.claimId === claimId && next.status) {
        setSuccess(decisions[decision].success);
        router.refresh();
      }
    } catch {
      setResult({ error: "Chưa xác nhận được kết quả. Vui lòng tải lại trạng thái trước khi thử lại.", claimId: null, status: null });
    } finally { setPending(false); }
  }

  return <div className="mt-4 space-y-3" aria-busy={pending}>
    {status === "pending" && <div className="flex flex-wrap gap-3">
      {(group === "sent" ? ["cancel"] as const : ["accept", "reject"] as const).map(decision => <button key={decision} type="button" aria-haspopup="dialog" disabled={pending || attempted || (decision === "accept" && !canAccept)} onClick={event => { opener.current = event.currentTarget; setOperation(decision); }} className="rounded-full border border-[#1c5546] px-4 py-2 text-sm font-semibold text-[#1c5546] disabled:cursor-not-allowed disabled:opacity-50">{decisions[decision].label}</button>)}
      {group === "received" && !canAccept && <p className="w-full text-sm text-[#5f746d]">Tin hiện không đủ điều kiện chấp nhận. Bạn vẫn có thể từ chối yêu cầu.</p>}
    </div>}
    {pending && <p role="status" className="text-sm">Đang xử lý yêu cầu…</p>}
    {success && <p role="status" className="text-sm text-[#28725c]">{success}</p>}
    {result?.error && <div className="space-y-2 text-sm">
      <p role="alert" className="text-[#b65e2b]">{result.error}</p>
      {result.status && <p>Trạng thái đã đọc lại: {claimStatusLabels[result.status]}</p>}
      <button type="button" className="underline" onClick={() => window.location.reload()}>Tải lại trạng thái trước khi thao tác tiếp</button>
    </div>}
    <AlertDialog open={operation !== null} onOpenChange={open => { if (!open) setOperation(null); }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{operation ? decisions[operation].label : "Xác nhận thao tác"}?</AlertDialogTitle>
          <AlertDialogDescription>{operation && decisions[operation].description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Quay lại</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={() => { if (operation) void submit(operation); }}>Xác nhận</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
