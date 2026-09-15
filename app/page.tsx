import Link from "next/link";
import { ArrowRight, BellRing, ClipboardCheck, Search, ShieldCheck } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { SiteHeader } from "@/components/site-header";
import { featuredPosts } from "@/lib/mock-data";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f8f4] text-[#17352d]">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-12 md:grid-cols-[1.1fr_.9fr] md:px-10 md:pt-20">
          <div className="flex flex-col justify-center">
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#b9d7cb] bg-[#e7f2ec] px-3 py-1.5 text-sm font-semibold text-[#28725c]"><span className="h-2 w-2 rounded-full bg-[#e58c4f]" /> Cộng đồng campus an tâm hơn</p>
            <h1 className="max-w-3xl font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">Đồ thất lạc, <em className="text-[#d87642]">tìm lại</em> dễ dàng.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f746d]">Nơi sinh viên và cán bộ trường đăng tin mất/nhặt được đồ, tìm kiếm nhanh và xác minh an toàn trước khi hoàn trả.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/posts" className="inline-flex items-center gap-2 rounded-full bg-[#1c5546] px-5 py-3 font-semibold text-white transition hover:bg-[#143f34]">Tìm đồ ngay <ArrowRight size={18} /></Link><Link href="/posts/new" className="rounded-full border border-[#a6c7ba] bg-white px-5 py-3 font-semibold text-[#1c5546] transition hover:bg-[#eaf3ee]">Đăng tin miễn phí</Link></div>
            <div className="mt-10 flex items-center gap-8 text-sm text-[#6f817a]"><span><strong className="text-xl text-[#1c5546]">128</strong> tin đang mở</span><span><strong className="text-xl text-[#1c5546]">64</strong> món đã về chủ</span></div>
          </div>
          <div className="relative min-h-[390px] overflow-hidden rounded-[2rem] bg-[#dcebe2] p-6 shadow-sm md:min-h-[520px]"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#c4decf]" /><div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-[#f2cfaa]" /><div className="relative flex h-full flex-col justify-between"><div className="flex justify-between text-sm font-semibold text-[#417467]"><span>UNI<span className="text-[#d87642]">LOST</span></span><span>01 / 03</span></div><div className="mx-auto w-full max-w-sm rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-xl backdrop-blur"><div className="flex items-center justify-between"><span className="rounded-full bg-[#e7f2ec] px-3 py-1 text-xs font-bold text-[#28725c]">ĐÃ TÌM THẤY</span><span className="text-xs text-[#7c9288]">2 giờ trước</span></div><div className="mt-5 flex items-center gap-4"><div className="grid h-20 w-20 place-items-center rounded-2xl bg-[#f3dfc7] text-4xl">🎧</div><div><h2 className="font-serif text-2xl">Tai nghe Sony</h2><p className="mt-1 text-sm text-[#6f817a]">Thư viện trung tâm · màu đen</p></div></div><div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#1c5546]"><Search size={16} /> 3 người đang tìm món tương tự</div></div><p className="text-right text-sm font-medium text-[#417467]">Một bài đăng có thể kết nối hai người.</p></div></div>
        </section>
        <section className="border-y border-[#dfe9e2] bg-white px-5 py-7 md:px-10"><div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3"><Value icon={<Search />} title="Tìm nhanh" text="Bộ lọc rõ ràng theo loại đồ, địa điểm và thời gian." /><Value icon={<ClipboardCheck />} title="Xác minh kín đáo" text="Chỉ người giữ đồ mới xem được thông tin nhận dạng của bạn." /><Value icon={<ShieldCheck />} title="Cộng đồng tin cậy" text="Lưu lại lịch sử và trạng thái hoàn trả minh bạch." /></div></section>
        <section className="mx-auto max-w-7xl px-5 py-14 md:px-10"><div className="flex items-end justify-between"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-[#d87642]">Mới nhất</p><h2 className="mt-2 font-serif text-4xl">Có thể bạn đang tìm</h2></div><Link href="/posts" className="hidden items-center gap-2 font-semibold text-[#1c5546] md:flex">Xem tất cả <ArrowRight size={17} /></Link></div><div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featuredPosts.map((post) => <PostCard key={post.id} post={post} />)}</div></section>
        <section className="mx-auto max-w-7xl px-5 pb-16 md:px-10"><div className="flex flex-col items-start justify-between gap-6 rounded-[1.5rem] bg-[#1c5546] p-8 text-white md:flex-row md:items-center md:p-10"><div><h2 className="font-serif text-3xl">Bạn vừa nhặt được đồ?</h2><p className="mt-2 text-[#c6dfd4]">Đăng tin để chủ nhân có thể tìm thấy món đồ của mình.</p></div><Link href="/posts/new" className="rounded-full bg-[#f3c999] px-5 py-3 font-bold text-[#17352d] hover:bg-[#ffd6a8]">Đăng tin ngay</Link></div></section>
      </main>
      <footer className="border-t border-[#dfe9e2] px-5 py-7 text-sm text-[#6f817a] md:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 md:flex-row"><span>© 2026 UniLost · Dự án đồ án chuyên ngành</span><span className="flex items-center gap-2"><BellRing size={15} /> An toàn, riêng tư, vì cộng đồng</span></div></footer>
    </div>
  );
}
function Value({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex gap-4 p-2"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e7f2ec] text-[#28725c]">{icon}</div><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#6f817a]">{text}</p></div></div>; }
