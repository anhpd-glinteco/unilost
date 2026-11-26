"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { categories } from "@/lib/mock-data";
import { closePost, updatePost, type PostMutationState } from "./actions";
import { updatePostSchema } from "./schemas";
import type { PostStatus } from "@/lib/types";

type EditablePost = {
  id: string; type: "lost" | "found"; status: PostStatus; title: string; category: string; color: string;
  description: string; location: string; occurred_at: string;
};

export function PostManagement({ post }: { post: EditablePost }) {
  const router = useRouter();
  const submitted = useRef(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [pending, setPending] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [result, setResult] = useState<PostMutationState | null>(null);
  const [success, setSuccess] = useState("");
  const eligible = post.status === "searching" || post.status === "matched";
  const [fields, setFields] = useState({ title: post.title, category: post.category, color: post.color, description: post.description, location: post.location, occurredAt: post.occurred_at });
  const buttonClass = "rounded-full border border-[#1c5546] px-4 py-2 text-sm font-semibold text-[#1c5546] disabled:cursor-not-allowed disabled:opacity-50";
  const inputClass = "w-full min-w-0 rounded-xl border border-[#dfe9e2] px-4 py-3";

  async function submit(operation: "update" | "close") {
    if (submitted.current || !eligible) return;
    if (operation === "update" && !updatePostSchema.safeParse(fields).success) {
      setResult({ error: "Vui lòng kiểm tra nội dung và ngày xảy ra.", postId: null, status: null, moderation: null });
      return;
    }
    submitted.current = true;
    setAttempted(true);
    setPending(true);
    setConfirmClose(false);
    setResult(null);
    const values = new FormData();
    values.set("postId", post.id);
    if (operation === "update") Object.entries(fields).forEach(([name, value]) => values.set(name, value));
    try {
      const next = await (operation === "update" ? updatePost : closePost)({ error: "", postId: null, status: null, moderation: null }, values);
      setResult(next);
      if (!next.error && next.postId === post.id && next.status && next.moderation) {
        setSuccess(operation === "close" ? "Đã đóng tin." : next.moderation === "pending" ? "Đã lưu tin, đang chờ duyệt." : next.moderation === "hidden" ? "Đã lưu tin. Tin vẫn đang ẩn." : "Đã lưu tin.");
        setEditing(false);
        router.refresh();
      } else if (!next.error) {
        setResult({ ...next, error: "Chưa xác nhận được kết quả. Vui lòng tải lại tin trước khi thử lại." });
      }
    } catch {
      setResult({ error: "Chưa xác nhận được kết quả. Vui lòng tải lại tin trước khi thử lại.", postId: null, status: null, moderation: null });
    } finally { setPending(false); }
  }

  function cancelEdit() {
    setFields({ title: post.title, category: post.category, color: post.color, description: post.description, location: post.location, occurredAt: post.occurred_at });
    setResult(null);
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  }

  return <section aria-label="Quản lý tin của bạn" aria-busy={pending} className="mt-8 min-w-0 space-y-4 rounded-2xl border bg-white p-5">
    <h2 className="text-xl font-semibold">Quản lý tin của bạn</h2>
    {!eligible && !success && <p className="text-sm">Tin hiện không còn cho phép sửa hoặc đóng.</p>}
    {!success && eligible && <div className="flex flex-wrap gap-3">
      <button ref={editButton} type="button" disabled={attempted || editing} onClick={() => setEditing(true)} className={buttonClass}>Sửa tin</button>
      <button ref={closeButton} type="button" aria-haspopup="dialog" disabled={attempted || editing} onClick={() => setConfirmClose(true)} className={buttonClass}>Đóng tin</button>
    </div>}
    {editing && eligible && <form onSubmit={event => { event.preventDefault(); void submit("update"); }} className="min-w-0 space-y-4">
      <p className="text-sm text-[#5f746d]">Loại tin không thay đổi. Tin đã xuất bản sẽ chờ duyệt lại sau khi sửa; tin ẩn vẫn giữ trạng thái ẩn.</p>
      <fieldset disabled={attempted} className="min-w-0 space-y-4 disabled:opacity-60">
        {([ ["title", "Tên món đồ", 4, 100], ["color", "Màu sắc", 1, 40], ["location", "Địa điểm", 2, 120] ] as const).map(([name, label, min, max]) => <div key={name}>
          <label htmlFor={`edit-${name}`} className="mb-2 block text-sm font-semibold">{label}</label>
          <input id={`edit-${name}`} name={name} required minLength={min} maxLength={max} value={fields[name]} onChange={event => setFields({ ...fields, [name]: event.target.value })} className={inputClass} />
        </div>)}
        <div><label htmlFor="edit-category" className="mb-2 block text-sm font-semibold">Danh mục</label>
          <select id="edit-category" name="category" value={fields.category} onChange={event => setFields({ ...fields, category: event.target.value })} className={inputClass}>{Array.from(new Set([fields.category, ...categories.slice(1)])).map(category => <option key={category}>{category}</option>)}</select>
        </div>
        <div><label htmlFor="edit-description" className="mb-2 block text-sm font-semibold">Đặc điểm nhận dạng</label>
          <textarea id="edit-description" name="description" required minLength={20} maxLength={1000} rows={4} value={fields.description} onChange={event => setFields({ ...fields, description: event.target.value })} className={inputClass} />
        </div>
        <div><label htmlFor="edit-occurredAt" className="mb-2 block text-sm font-semibold">Ngày {post.type === "lost" ? "thất lạc" : "nhặt được"}</label>
          <input id="edit-occurredAt" name="occurredAt" type="date" required min="0001-01-01" max="9999-12-31" value={fields.occurredAt} onChange={event => setFields({ ...fields, occurredAt: event.target.value })} className={inputClass} />
        </div>
        <div className="flex flex-wrap gap-3"><button type="submit" className={buttonClass}>Lưu thay đổi</button><button type="button" onClick={cancelEdit} className={buttonClass}>Hủy sửa</button></div>
      </fieldset>
    </form>}
    {pending && <p role="status">Đang xử lý…</p>}
    {success && <p role="status" className="text-sm text-[#28725c]">{success}</p>}
    {!pending && result?.error && <p role="alert" className="text-sm text-[#b65e2b]">{result.error}</p>}
    {!pending && attempted && <button type="button" onClick={() => window.location.reload()} className="text-sm underline">Tải lại tin trước khi thao tác tiếp</button>}
    <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); closeButton.current?.focus(); }}>
        <AlertDialogHeader><AlertDialogTitle>Đóng tin này?</AlertDialogTitle><AlertDialogDescription>Tin sẽ chuyển sang đã đóng. Các yêu cầu nhận đồ được giữ nguyên. Hiện chưa hỗ trợ mở lại tin.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Quay lại</AlertDialogCancel><AlertDialogAction disabled={attempted} onClick={() => void submit("close")}>Xác nhận đóng tin</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
