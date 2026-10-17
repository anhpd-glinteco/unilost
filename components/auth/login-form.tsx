"use client";

import { useRef, useState } from "react";
import { sendLoginLink } from "@/lib/auth/login";

export function LoginForm({ returnTo, initialError, registration = false }: { returnTo: string; initialError: string; registration?: boolean }) {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError);
  const submitting = useRef(false);

  if (sent) return <div role="status" className="mt-6 rounded-xl bg-[#e7f2ec] p-4 text-sm text-[#28725c]">Link đăng nhập đã được gửi. Hãy mở email trên trình duyệt này để hoàn tất đăng nhập.</div>;

  return <form method="post" onSubmit={async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "");
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      await sendLoginLink(email, window.location.origin, returnTo, registration ? String(values.get("full_name") ?? "") : undefined);
      setSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }} aria-busy={pending} className="mt-6 space-y-4">
    {registration && <div>
      <label htmlFor="full-name" className="mb-2 block text-sm font-semibold">Họ và tên</label>
      <input id="full-name" name="full_name" required maxLength={100} autoComplete="name" disabled={pending} className="w-full rounded-xl border border-[#dfe9e2] px-4 py-3"/>
    </div>}
    <div>
      <label htmlFor="email" className="mb-2 block text-sm font-semibold">Email</label>
      <input id="email" name="email" required type="email" autoComplete="email" placeholder="ban@example.edu.vn" disabled={pending} aria-describedby={error ? "login-error" : undefined} className="w-full rounded-xl border border-[#dfe9e2] px-4 py-3"/>
    </div>
    {error && <p id="login-error" role="alert" className="text-sm text-[#b65e2b]">{error}</p>}
    <button disabled={pending} className="w-full rounded-full bg-[#1c5546] px-5 py-3 font-bold text-white disabled:opacity-60">{pending ? "Đang gửi…" : registration ? "Gửi link tạo tài khoản" : "Gửi link đăng nhập"}</button>
  </form>;
}
