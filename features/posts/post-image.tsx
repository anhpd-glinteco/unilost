"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MAX_IMAGE_BYTES } from "./image-file";

export function PostImage({ postId, manageable = false }: { postId: string; manageable?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [image, setImage] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [locked, setLocked] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const submitting = useRef(false);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  useEffect(() => {
    const controller = new AbortController();
    let url = "";
    fetch(`/api/posts/${postId}/image`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (response.status === 404) { if (!controller.signal.aborted) setImage(""); return; }
        if (!response.ok) throw new Error("image-load");
        const blob = await response.blob();
        if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setImage(url); }
      })
      .catch(() => {
        if (!controller.signal.aborted) { setLocked(true); setError("Không thể tải ảnh của tin. Vui lòng tải lại tin."); }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [postId, revision]);

  async function send(method: "PUT" | "DELETE") {
    if (submitting.current || locked || loading || (method === "PUT" && !file)) return;
    submitting.current = true;
    setPending(true); setError(""); setMessage(""); setConfirmDelete(false);
    try {
      const response = await fetch(`/api/posts/${postId}/image`, {
        method, ...(method === "PUT" && file ? { headers: { "Content-Type": file.type }, body: file } : {}),
      });
      const result = await response.json() as { confirmed?: unknown; cleanupPending?: unknown };
      if (!response.ok || result.confirmed !== true) throw new Error("unconfirmed");
      setFile(null);
      setPreview("");
      setImage("");
      setMessage(`${method === "PUT" ? "Ảnh đã được lưu." : "Đã xóa ảnh."} Tin đã xuất bản sẽ chờ duyệt lại.${result.cleanupPending === true ? " Ảnh cũ đang chờ dọn dẹp." : ""}`);
      setLoading(true);
      setRevision(value => value + 1);
      router.refresh();
    } catch {
      setLocked(true);
      setError("Chưa xác nhận được thao tác. Tải lại tin trước khi thử tiếp.");
    } finally { submitting.current = false; setPending(false); }
  }

  function choose(next: File | undefined) {
    setError(""); setMessage("");
    setPreview("");
    if (!next) { setFile(null); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || next.size === 0 || next.size > MAX_IMAGE_BYTES) {
      setFile(null); setError("Chọn JPEG, PNG hoặc WebP có dữ liệu, tối đa 5 MiB."); return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  return <section aria-label="Ảnh món đồ" aria-busy={loading || pending} className="min-w-0 w-full space-y-3">
    {preview || image ? <img src={preview || image} alt={preview ? "Ảnh xem trước, chưa tải lên" : "Ảnh món đồ"} className="max-h-80 max-w-full rounded-xl object-contain" onError={() => {
      setError("Không thể hiển thị ảnh. Vui lòng chọn tệp ảnh hợp lệ.");
    }} /> : <p>{loading ? "Đang tải ảnh…" : "Chưa có ảnh"}</p>}
    {manageable && <>
      <label className="block text-sm font-semibold">{image ? "Thay ảnh" : "Thêm ảnh"}
        <input aria-label="Chọn ảnh món đồ" type="file" accept="image/jpeg,image/png,image/webp" disabled={loading || pending || locked} onChange={event => {
          choose(event.currentTarget.files?.[0]); event.currentTarget.value = "";
        }} className="mt-2 block w-full min-w-0 max-w-full text-sm" />
      </label>
      <p className="text-xs">JPEG, PNG hoặc WebP, tối đa 5 MiB. Ảnh thay đổi trên tin đã xuất bản cần được duyệt lại.</p>
      <div className="flex flex-wrap gap-2">
        {file && <Button type="button" disabled={loading || pending || locked} onClick={() => void send("PUT")}>{pending ? "Đang xử lý…" : "Tải ảnh lên"}</Button>}
        {file && <Button type="button" variant="outline" disabled={pending || locked} onClick={() => { setFile(null); setPreview(""); }}>Bỏ chọn ảnh</Button>}
        {image && <Button ref={deleteButton} type="button" variant="outline" disabled={loading || pending || locked} onClick={() => setConfirmDelete(true)}>Xóa ảnh</Button>}
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); deleteButton.current?.focus(); }}>
          <AlertDialogHeader><AlertDialogTitle>Xóa ảnh này?</AlertDialogTitle><AlertDialogDescription>Ảnh sẽ được gỡ khỏi tin. Tin đã xuất bản sẽ chờ duyệt lại.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Quay lại</AlertDialogCancel><AlertDialogAction disabled={pending || locked} onClick={() => void send("DELETE")}>Xác nhận xóa ảnh</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>}
    {error && <p role="alert" className="text-sm text-[#b65e2b]">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {locked && <Button asChild variant="link"><a href={`/posts/${postId}`}>Tải lại tin</a></Button>}
  </section>;
}
