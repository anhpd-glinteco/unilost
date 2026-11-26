import Link from "next/link";
import { ArrowRight, BellRing, ClipboardCheck, Search, ShieldCheck } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { SiteHeader } from "@/components/site-header";
import { readPublicPosts } from "@/features/posts/public-list";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recent = await readPublicPosts({ q: "", type: "all", category: "", sort: "newest", page: 1 });
  return (
    <div className="min-h-screen bg-[#f7f8f4] text-[#17352d]">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-12 md:px-10 md:pt-20">
          <div className="flex flex-col justify-center">
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#b9d7cb] bg-[#e7f2ec] px-3 py-1.5 text-sm font-semibold text-[#28725c]"><span className="h-2 w-2 rounded-full bg-[#e58c4f]" /> Cộng đồng campus an tâm hơn</p>
            <h1 className="max-w-3xl font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">Đồ thất lạc, <em className="text-[#d87642]">tìm lại</em> dễ dàng.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f746d]">Nơi sinh viên và cán bộ trường đăng tin mất/nhặt được đồ, tìm kiếm nhanh và xác minh an toàn trước khi hoàn trả.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/posts" className="inline-flex items-center gap-2 rounded-full bg-[#1c5546] px-5 py-3 font-semibold text-white transition hover:bg-[#143f34]">Tìm đồ ngay <ArrowRight size={18} /></Link><Link href="/posts/new" className="rounded-full border border-[#a6c7ba] bg-white px-5 py-3 font-semibold text-[#1c5546] transition hover:bg-[#eaf3ee]">Đăng tin miễn phí</Link></div>
          </div>
        </section>
        <section className="border-y border-[#dfe9e2] bg-white px-5 py-7 md:px-10"><div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3"><Value icon={<Search />} title="Tìm nhanh" text="Bộ lọc rõ ràng theo loại đồ, địa điểm và thời gian." /><Value icon={<ClipboardCheck />} title="Xác minh kín đáo" text="Thông tin xác minh chỉ hiển thị cho người gửi, chủ tin và quản trị viên." /><Value icon={<ShieldCheck />} title="Cộng đồng tin cậy" text="Lưu lại lịch sử và trạng thái hoàn trả minh bạch." /></div></section>
        <section className="mx-auto max-w-7xl px-5 py-14 md:px-10"><div className="flex items-end justify-between"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-[#d87642]">Mới nhất</p><h2 className="mt-2 font-serif text-4xl">Có thể bạn đang tìm</h2></div><Link href="/posts" className="hidden items-center gap-2 font-semibold text-[#1c5546] md:flex">Xem tất cả <ArrowRight size={17} /></Link></div><div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{recent.kind === "error" ? <p role="alert">Không thể tải tin mới.</p> : recent.posts.length ? recent.posts.slice(0, 6).map((post) => <PostCard key={post.id} post={post} />) : <p role="status">Chưa có tin công khai.</p>}</div></section>
        <section className="mx-auto max-w-7xl px-5 pb-16 md:px-10"><div className="flex flex-col items-start justify-between gap-6 rounded-[1.5rem] bg-[#1c5546] p-8 text-white md:flex-row md:items-center md:p-10"><div><h2 className="font-serif text-3xl">Bạn vừa nhặt được đồ?</h2><p className="mt-2 text-[#c6dfd4]">Đăng tin để chủ nhân có thể tìm thấy món đồ của mình.</p></div><Link href="/posts/new" className="rounded-full bg-[#f3c999] px-5 py-3 font-bold text-[#17352d] hover:bg-[#ffd6a8]">Đăng tin ngay</Link></div></section>
      </main>
      <footer className="border-t border-[#dfe9e2] px-5 py-7 text-sm text-[#6f817a] md:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 md:flex-row"><span>© 2026 UniLost · Dự án đồ án chuyên ngành</span><span className="flex items-center gap-2"><BellRing size={15} /> An toàn, riêng tư, vì cộng đồng</span></div></footer>
    </div>
  );
}
function Value({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex gap-4 p-2"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e7f2ec] text-[#28725c]">{icon}</div><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#6f817a]">{text}</p></div></div>; }
