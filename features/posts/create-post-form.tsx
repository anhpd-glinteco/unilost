"use client";

import { useActionState, useState } from "react";
import { createFoundPost, type CreatePostState } from "./actions";
import { categories } from "@/lib/mock-data";

export function CreatePostForm() {
  const [version, setVersion] = useState(0);
  return <FoundForm key={version} onNew={() => setVersion(version + 1)} />;
}

function FoundForm({ onNew }: { onNew: () => void }) {
  const [fields, setFields] = useState({ title: "", category: categories[1], color: "", description: "", location: "", occurredAt: "" });
  const [state, action, pending] = useActionState(async (previous: CreatePostState, values: FormData) => {
    try { return await createFoundPost(previous, values); }
    catch { return { error: "Không thể tạo tin. Vui lòng thử lại sau.", postId: null }; }
  }, { error: "", postId: null });
  const inputClass = "w-full min-w-0 rounded-xl border border-[#dfe9e2] px-4 py-3";
  return <form action={action} aria-busy={pending} className="mt-8 min-w-0 space-y-5 rounded-2xl border border-[#dfe9e2] bg-white p-6 md:p-8">
    <p className="text-sm text-[#5f746d]">Tin nhặt được đồ sẽ chờ duyệt trước khi xuất hiện công khai. Chưa hỗ trợ tải ảnh.</p>
    <fieldset disabled={pending || !!state.postId} className="min-w-0 space-y-5 disabled:opacity-60">
      {([ ["title", "Tên món đồ", 4, 100], ["color", "Màu sắc", 1, 40], ["location", "Địa điểm", 2, 120] ] as const).map(([name, label, min, max]) => <div key={name}>
        <label htmlFor={name} className="mb-2 block text-sm font-semibold">{label}</label>
        <input id={name} name={name} required minLength={min} maxLength={max} value={fields[name]} onChange={(event) => setFields({ ...fields, [name]: event.target.value })} className={inputClass} />
      </div>)}
      <div><label htmlFor="category" className="mb-2 block text-sm font-semibold">Danh mục</label>
        <select id="category" name="category" value={fields.category} onChange={(event) => setFields({ ...fields, category: event.target.value })} className={inputClass}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select>
      </div>
      <div><label htmlFor="description" className="mb-2 block text-sm font-semibold">Đặc điểm nhận dạng</label>
        <textarea id="description" name="description" required minLength={20} maxLength={1000} rows={4} value={fields.description} onChange={(event) => setFields({ ...fields, description: event.target.value })} className={inputClass} />
      </div>
      <div><label htmlFor="occurredAt" className="mb-2 block text-sm font-semibold">Ngày nhặt được</label>
        <input id="occurredAt" name="occurredAt" type="date" required min="0001-01-01" max="9999-12-31" value={fields.occurredAt} onChange={(event) => setFields({ ...fields, occurredAt: event.target.value })} className={inputClass} />
      </div>
      <button className="w-full rounded-full bg-[#1c5546] px-5 py-3 font-bold text-white hover:bg-[#143f34]">{pending ? "Đang gửi…" : "Đăng tin nhặt được đồ"}</button>
    </fieldset>
    {!pending && state.error && <p role="alert" className="text-sm text-[#b65e2b]">{state.error}</p>}
    {state.postId && <div role="status" className="space-y-3 text-sm text-[#28725c]"><p>Đã tạo tin, đang chờ duyệt.</p><p className="break-all">Mã tin: {state.postId}</p><button type="button" onClick={onNew} className="rounded-full border border-[#28725c] px-4 py-2 font-semibold">Tạo tin khác</button></div>}
  </form>;
}
