import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { readPost } from "@/features/posts/queries";

export const dynamic = "force-dynamic";
const statuses = { searching: "Đang tìm", matched: "Có gợi ý phù hợp", verifying: "Đang xác minh", returned: "Đã hoàn trả", closed: "Đã đóng" };
const moderationLabels = { published: "Đã xuất bản", pending: "Chờ duyệt", hidden: "Đã ẩn" };

export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await readPost(id);
  if (result.kind === "missing") notFound();
  return <div className="min-h-screen bg-[#f7f8f4]">
    <SiteHeader />
    <main className="mx-auto max-w-5xl px-5 py-10 md:px-10 md:py-14">
      <Link href="/posts" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1c5546]"><ArrowLeft size={16} /> Quay lại danh sách</Link>
      {result.kind === "error" ? <section role="alert" className="mt-8 rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Không thể tải tin</h1>
        <p className="mt-3">Vui lòng thử lại sau.</p>
        <a href={`/posts/${id}`} className="mt-4 inline-block underline">Thử lại</a>
      </section> : <article className="mt-8 grid gap-8 md:grid-cols-[.8fr_1.2fr]">
        <div className="grid min-h-[250px] place-items-center rounded-3xl bg-[#f3dfc7] p-6 text-[#5f746d]">Chưa có ảnh</div>
        <div className="min-w-0 break-words">
          <p className="font-semibold text-[#28725c]">{result.post.type === "lost" ? "Tin thất lạc" : "Tin nhặt được đồ"}</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">{result.post.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-lg leading-8 text-[#5f746d]">{result.post.description}</p>
          <div className="mt-6 space-y-3 text-sm text-[#5f746d]">
            <p className="flex items-start gap-3"><MapPin size={18} className="shrink-0" />{result.post.location}</p>
            <p>Ngày xảy ra: <time dateTime={result.post.occurred_at}>{result.post.occurred_at.split("-").reverse().join("/")}</time></p>
            <p>Danh mục: {result.post.category} · Màu sắc: {result.post.color}</p>
            <p>Trạng thái: {statuses[result.post.status]}</p>
            <p>Kiểm duyệt: {moderationLabels[result.post.moderation]}</p>
          </div>
          <button disabled className="mt-8 max-w-full rounded-full bg-[#1c5546] px-5 py-3 font-bold text-white opacity-60">Yêu cầu nhận đồ chưa khả dụng</button>
        </div>
      </article>}
    </main>
  </div>;
}
