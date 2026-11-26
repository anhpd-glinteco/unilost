import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { LoginForm } from "@/components/auth/login-form";
import { getSupabaseUser } from "@/lib/supabase/server";
import { safeAuthReturnPath } from "@/lib/auth/return-path";
import { signOut } from "../actions";

export const dynamic = "force-dynamic";

const errors = new Map([
  ["callback", "Link đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới trên trình duyệt đã gửi yêu cầu."],
  ["configuration", "Đăng nhập chưa được cấu hình. Vui lòng thử lại sau."],
  ["logout", "Không thể đăng xuất. Vui lòng thử lại."],
]);

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> }) {
  const params = await searchParams;
  const returnTo = safeAuthReturnPath(params.next);
  const error = typeof params.error === "string" ? errors.get(params.error) ?? "" : "";
  const user = await getSupabaseUser();

  return <div className="min-h-screen bg-[#f7f8f4]">
    <SiteHeader/>
    <main className="mx-auto max-w-md px-5 py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f746d]"><ArrowLeft size={16}/> Trang chủ</Link>
      <div className="mt-10 rounded-2xl border border-[#dfe9e2] bg-white p-7 shadow-sm">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#e7f2ec] text-[#28725c]"><Mail/></div>
        <h1 className="mt-5 font-serif text-4xl">{user ? "Bạn đã đăng nhập" : "Chào mừng trở lại"}</h1>
        {user ? <div className="mt-6 space-y-4">
          <p className="break-words text-[#6f817a]">{user.email}</p>
          <Link href={returnTo} className="block font-bold text-[#1c5546]">Tiếp tục</Link>
          {error && <p role="alert" className="text-sm text-[#b65e2b]">{error}</p>}
          <form action={signOut}><button className="rounded-full bg-[#1c5546] px-5 py-3 font-bold text-white">Đăng xuất</button></form>
        </div> : <>
          <p className="mt-2 text-[#6f817a]">Đăng nhập để quản lý tin và yêu cầu của bạn.</p>
          <LoginForm returnTo={returnTo} initialError={error}/>
          <p className="mt-6 text-center text-sm text-[#6f817a]">Chưa có tài khoản? <Link href="/auth/register" className="font-bold text-[#1c5546]">Đăng ký</Link></p>
        </>}
      </div>
    </main>
  </div>;
}
