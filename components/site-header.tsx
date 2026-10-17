import Link from "next/link";
import { Plus } from "lucide-react";
import { getAccount } from "@/lib/auth/account";
import { signOut } from "@/app/auth/actions";
import { MobileMenu } from "./mobile-menu";

export async function SiteHeader() {
  const { user, profile } = await getAccount();
  const links = <>
    <Link href="/posts">Tìm đồ</Link>
    {user && <Link href="/dashboard">Bảng tin của tôi</Link>}
    {profile?.role === "admin" && <Link href="/admin">Quản trị</Link>}
    {user ? <>
      <Link href="/dashboard#profile" className="max-w-48 truncate" aria-label="Hồ sơ tài khoản">{profile?.full_name ?? user.email ?? "Hồ sơ"}</Link>
      <form action={signOut}><button className="font-semibold">Đăng xuất</button></form>
    </> : <><Link href="/auth/login">Đăng nhập</Link><Link href="/auth/register">Đăng ký</Link></>}
    <Link href="/posts/new" className="inline-flex w-fit items-center gap-2 rounded-full bg-[#1c5546] px-4 py-2 text-sm font-bold text-white hover:bg-[#143f34]"><Plus size={16}/> Đăng tin</Link>
  </>;
  return <header className="relative z-20 border-b border-[#dfe9e2] bg-[#f7f8f4]/90 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 md:px-10">
      <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-[#1c5546]">UNI<span className="text-[#d87642]">LOST</span></Link>
      <nav aria-label="Điều hướng chính" className="hidden items-center gap-5 text-sm font-semibold text-[#5f746d] md:flex">{links}</nav>
      <MobileMenu>{links}</MobileMenu>
    </div>
  </header>;
}
