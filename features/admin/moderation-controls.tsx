"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { moderatePost } from "./actions";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
const labels = { publish: "Xuất bản", hide: "Ẩn tin", restore: "Khôi phục" };
export function ModerationControls({ postId, moderation }: { postId: string; moderation: "pending" | "published" | "hidden" }) {
  const action = moderation === "pending" ? "publish" : moderation === "hidden" ? "restore" : "hide";
  const router = useRouter();
  const lock = useRef(false);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function submit() {
    if (lock.current) return;
    lock.current = true; setAttempted(true); setOpen(false); setMessage("Đang xử lý…");
    const values = new FormData(); values.set("postId", postId); values.set("action", action);
    try {
      const result = await moderatePost({ error: "", postId: null }, values);
      if (result.error || result.postId !== postId) { setError(true); setMessage(result.error || "Chưa xác nhận được kết quả."); }
      else { setMessage("Đã lưu kiểm duyệt."); router.refresh(); }
    } catch { setError(true); setMessage("Chưa xác nhận được kết quả. Tải lại trạng thái trước khi thao tác tiếp."); }
  }
  return <div className="space-y-2">
    <button ref={opener} type="button" disabled={attempted} aria-haspopup="dialog" onClick={() => setOpen(true)} className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50">{labels[action]}</button>
    {message && <p role={error ? "alert" : "status"}>{message}</p>}
    {error && <button type="button" onClick={() => window.location.reload()} className="underline">Tải lại trạng thái</button>}
    <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
      <AlertDialogHeader><AlertDialogTitle>{labels[action]}?</AlertDialogTitle><AlertDialogDescription>Thay đổi quyền hiển thị của tin và lưu nhật ký kiểm duyệt. Trạng thái nhận/trả đồ được giữ nguyên.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Quay lại</AlertDialogCancel><AlertDialogAction onClick={() => void submit()}>Xác nhận</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>;
}
