"use client";

import { useActionState, useState } from "react";
import { updateProfile, type ProfileState } from "@/app/dashboard/actions";

export function ProfileForm({ fullName, faculty }: { fullName: string; faculty: string | null }) {
  const [name, setName] = useState(fullName);
  const [department, setDepartment] = useState(faculty ?? "");
  const [state, action, pending] = useActionState(async (previous: ProfileState, values: FormData) => {
    try {
      const result = await updateProfile(previous, values);
      if (result.saved) {
        setName(String(values.get("full_name") ?? "").trim());
        setDepartment(String(values.get("faculty") ?? "").trim());
      }
      return result;
    } catch {
      return { error: "Không thể lưu hồ sơ. Vui lòng thử lại sau.", saved: false };
    }
  }, { error: "", saved: false });
  return <form action={action} aria-busy={pending} className="mt-5 space-y-4">
    <div>
      <label htmlFor="profile-name" className="mb-2 block text-sm font-semibold">Họ và tên</label>
      <input id="profile-name" name="full_name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoComplete="name" disabled={pending} aria-describedby={!pending && state.error ? "profile-error" : undefined} className="w-full rounded-xl border border-[#dfe9e2] px-4 py-3" />
    </div>
    <div>
      <label htmlFor="profile-faculty" className="mb-2 block text-sm font-semibold">Khoa (không bắt buộc)</label>
      <input id="profile-faculty" name="faculty" value={department} onChange={(event) => setDepartment(event.target.value)} maxLength={100} disabled={pending} aria-describedby={!pending && state.error ? "profile-error" : undefined} className="w-full rounded-xl border border-[#dfe9e2] px-4 py-3" />
    </div>
    {!pending && state.error && <p id="profile-error" role="alert" className="text-sm text-[#b65e2b]">{state.error}</p>}
    {!pending && state.saved && name.trim() === fullName && (department.trim() || null) === faculty && <p role="status" className="text-sm text-[#28725c]">Đã lưu hồ sơ.</p>}
    <button disabled={pending} className="w-full rounded-full bg-[#1c5546] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Đang lưu…" : "Lưu hồ sơ"}</button>
  </form>;
}
