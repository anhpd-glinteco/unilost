import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAccount } from "@/lib/auth/account";
import { SiteHeader } from "@/components/site-header";
import { CreatePostForm } from "@/features/posts/create-post-form";

export default async function NewPostPage() {
  const account = await requireAccount("/posts/new");
  return <div className="min-h-screen bg-[#f7f8f4]"><SiteHeader />
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-10 md:py-14">
      <Link href="/posts" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f746d]"><ArrowLeft size={16} /> Quay lại</Link>
      <div className="mt-8"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#d87642]">Chia sẻ với cộng đồng</p>
        <h1 className="mt-2 font-serif text-5xl">Đăng tin nhặt được đồ</h1><p className="mt-3 text-[#6f817a]">Thông tin càng cụ thể, cơ hội tìm lại càng cao.</p>
      </div>
      {account.profile ? <CreatePostForm /> : <p role="alert" className="mt-8">{account.profileError}</p>}
    </main>
  </div>;
}
