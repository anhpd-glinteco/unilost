"use client";

import { useActionState, useState } from "react";
import { createFoundPost, createLostPost, type CreatePostState } from "./actions";
import { categories } from "@/lib/mock-data";

type PostType = "found" | "lost";
type PostFields = { title: string; category: string; color: string; description: string; location: string; occurredAt: string };
const emptyFields = (): PostFields => ({ title: "", category: categories[1], color: "", description: "", location: "", occurredAt: "" });

export function CreatePostForm() {
  const [type, setType] = useState<PostType>("found");
  const [fields, setFields] = useState<PostFields>(emptyFields);
  const [version, setVersion] = useState(0);
  return <PostForm key={`${type}-${version}`} type={type} onTypeChange={setType} fields={fields} setFields={setFields} onNew={() => { setFields(emptyFields()); setVersion(version + 1); }} />;
}

function PostForm({ type, onTypeChange, fields, setFields, onNew }: {
  type: PostType;
  onTypeChange: (type: PostType) => void;
  fields: PostFields;
  setFields: (fields: PostFields) => void;
  onNew: () => void;
}) {
  const createPost = type === "found" ? createFoundPost : createLostPost;
  const [state, action, pending] = useActionState(async (previous: CreatePostState, values: FormData) => {
    try { return await createPost(previous, values); }
    catch { return { error: "Không thể tạo tin. Vui lòng thử lại sau.", postId: null }; }
  }, { error: "", postId: null });
  const inputClass = "w-full min-w-0 rounded-xl border border-[#dfe9e2] px-4 py-3";
  const found = type === "found";
  return <form action={action} aria-busy={pending} className="mt-8 min-w-0 space-y-5 rounded-2xl border border-[#dfe9e2] bg-white p-6 md:p-8">
    <p className="text-sm text-[#5f746d]">Tin {found ? "nhặt được" : "thất lạc"} sẽ chờ duyệt trước khi xuất hiện công khai. Chưa hỗ trợ tải ảnh.</p>
    <fieldset disabled={pending || !!state.postId} className="min-w-0 space-y-5 disabled:opacity-60">
      <div><label htmlFor="postType" className="mb-2 block text-sm font-semibold">Loại tin</label>
        <select id="postType" value={type} onChange={(event) => onTypeChange(event.target.value as PostType)} className={inputClass}>
          <option value="found">Nhặt được đồ</option><option value="lost">Thất lạc đồ</option>
        </select>
      </div>
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
      <div><label htmlFor="occurredAt" className="mb-2 block text-sm font-semibold">Ngày {found ? "nhặt được" : "thất lạc"}</label>
        <input id="occurredAt" name="occurredAt" type="date" required min="0001-01-01" max="9999-12-31" value={fields.occurredAt} onChange={(event) => setFields({ ...fields, occurredAt: event.target.value })} className={inputClass} />
      </div>
      <button className="w-full rounded-full bg-[#1c5546] px-5 py-3 font-bold text-white hover:bg-[#143f34]">{pending ? "Đang gửi…" : `Đăng tin ${found ? "nhặt được" : "thất lạc"} đồ`}</button>
    </fieldset>
    {!pending && state.error && <p role="alert" className="text-sm text-[#b65e2b]">{state.error}</p>}
    {state.postId && <div role="status" className="space-y-3 text-sm text-[#28725c]"><p>Đã tạo tin {found ? "nhặt được" : "thất lạc"}, đang chờ duyệt.</p><p className="break-all">Mã tin: {state.postId}</p><button type="button" onClick={onNew} className="rounded-full border border-[#28725c] px-4 py-2 font-semibold">Tạo tin khác</button></div>}
  </form>;
}
