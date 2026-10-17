import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { LoginForm } from "@/components/auth/login-form";
import { safeAuthReturnPath } from "@/lib/auth/return-path";
import { getSupabaseUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const returnTo = next === undefined ? "/dashboard" : safeAuthReturnPath(next);
  if (await getSupabaseUser()) redirect(returnTo);
  return <div className="min-h-screen bg-[#f7f8f4]"><SiteHeader/><main className="mx-auto max-w-md px-5 py-16">
    <Link href={`/auth/login?next=${encodeURIComponent(returnTo)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f746d]"><ArrowLeft size={16}/> Đăng nhập</Link>
    <div className="mt-10 rounded-2xl border border-[#dfe9e2] bg-white p-7">
      <h1 className="font-serif text-4xl">Tạo tài khoản UniLost</h1>
      <p className="mt-2 text-[#6f817a]">Dùng email bạn thường xuyên kiểm tra. Mở link xác thực trên trình duyệt này để hoàn tất. Nếu đã có tài khoản, link sẽ đăng nhập và giữ nguyên hồ sơ.</p>
      <LoginForm registration returnTo={returnTo} initialError=""/>
    </div>
  </main></div>;
}
