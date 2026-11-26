import Link from "next/link";
import { requireAccount } from "@/lib/auth/account";
import { SiteHeader } from "@/components/site-header";
import { moderationSchema, readModeration } from "@/features/admin/queries";
import { ModerationControls } from "@/features/admin/moderation-controls";
export const metadata = { title: "Quản trị nội dung", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
const labels = { pending: "Chờ duyệt", published: "Đã xuất bản", hidden: "Đã ẩn" };
export default async function AdminPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAccount("/admin", true);
  const params = await searchParams || {};
  const moderation = moderationSchema.safeParse(params.moderation ?? "pending");
  const page = typeof params.page === "string" && /^[1-9]\d{0,5}$/.test(params.page) ? Number(params.page) : params.page === undefined ? 1 : 0;
  const result = moderation.success && page > 0 && page <= 100000 ? await readModeration(moderation.data, page) : null;
  return <div className="min-h-screen bg-[#f7f8f4]"><SiteHeader /><main className="mx-auto max-w-6xl space-y-6 px-5 py-10">
    <Link href="/">Trang chủ</Link><h1 className="font-serif text-4xl">Kiểm duyệt nội dung</h1>
    <nav aria-label="Trạng thái kiểm duyệt" className="flex flex-wrap gap-4">{moderationSchema.options.map(state => <Link key={state} aria-current={moderation.success && moderation.data === state ? "page" : undefined} href={`/admin?moderation=${state}`}>{labels[state]}</Link>)}</nav>
    {!result ? <div role="alert"><p>Không thể tải dữ liệu hoặc bộ lọc không hợp lệ.</p><a href="/admin" className="underline">Tải lại danh sách</a></div> : <>
      <dl className="grid gap-3 sm:grid-cols-3">{result.counts.map(({ state, total }) => <div key={state} className="rounded-xl border bg-white p-4"><dt>{labels[state]}</dt><dd>{total ?? "Không tải được"}</dd></div>)}</dl>
      {!result.posts.length && <p role="status">Không có tin ở trang này.</p>}
      <ul className="space-y-4">{result.posts.map(post => <li key={post.id} className="space-y-3 break-words rounded-xl border bg-white p-5"><Link href={`/posts/${post.id}`} className="text-xl underline">{post.title}</Link><p>{labels[post.moderation]} · {post.status}</p><ModerationControls key={`${post.id}-${post.moderation}`} postId={post.id} moderation={post.moderation} /></li>)}</ul>
      <nav aria-label="Phân trang kiểm duyệt" className="flex flex-wrap gap-4">{page > 1 && <Link href={`/admin?moderation=${moderation.success ? moderation.data : "pending"}&page=${page - 1}`}>Trang trước</Link>}<span>Trang {page}</span>{result.hasNext && <Link href={`/admin?moderation=${moderation.success ? moderation.data : "pending"}&page=${page + 1}`}>Trang sau</Link>}</nav>
      <h2 className="font-serif text-2xl">20 thao tác kiểm duyệt gần nhất</h2>
      {result.audit === null ? <p role="alert">Không thể tải nhật ký.</p> : <ul className="space-y-2">{result.audit.map(entry => <li key={entry.id} className="break-words">{entry.action} · <Link href={`/posts/${entry.post_id}`}>{entry.post_id}</Link> · <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</time></li>)}</ul>}
    </>}
  </main></div>;
}
