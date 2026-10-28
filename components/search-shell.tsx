import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { categories } from "@/lib/mock-data";
import { POST_PAGE_SIZE, postListHref, type PostFilters, type PublicPostList } from "@/features/posts/public-list";
import { PostCard } from "./post-card";

export function SearchShell({ result, filters }: { result: PublicPostList; filters: PostFilters }) {
  const options = categories.slice(1);
  if (filters.category && !options.includes(filters.category)) options.push(filters.category);
  const lastPage = result.kind === "ok" ? Math.max(1, Math.ceil(result.count / POST_PAGE_SIZE)) : 1;
  return <div>
    <form action="/posts" method="get" className="rounded-2xl border border-[#dfe9e2] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 rounded-xl bg-[#f7f8f4] px-4 py-3"><Search className="shrink-0 text-[#7e9188]" size={19} /><input name="q" defaultValue={filters.q} maxLength={120} placeholder="Bạn đang tìm món gì?" className="min-w-0 w-full bg-transparent outline-none placeholder:text-[#9aa9a3]" aria-label="Từ khóa tìm kiếm" /></div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={17} className="mr-1 text-[#7e9188]" />
        <select aria-label="Loại tin" name="type" defaultValue={filters.type} className="max-w-full rounded-full border border-[#dfe9e2] px-3 py-2 text-sm"><option value="all">Tất cả loại tin</option><option value="lost">Đang tìm</option><option value="found">Đã nhặt được</option></select>
        <select aria-label="Danh mục" name="category" defaultValue={filters.category} className="max-w-full rounded-full border border-[#dfe9e2] px-3 py-2 text-sm"><option value="">Tất cả danh mục</option>{options.map(item => <option key={item}>{item}</option>)}</select>
        <select aria-label="Sắp xếp" name="sort" defaultValue={filters.sort} className="max-w-full rounded-full border border-[#dfe9e2] px-3 py-2 text-sm"><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select>
        <button type="submit" className="rounded-full bg-[#1c5546] px-5 py-2 text-sm font-semibold text-white">Tìm kiếm</button>
        {result.kind === "ok" && <span role="status" className="ml-auto text-sm text-[#7e9188]">{result.count} kết quả</span>}
      </div>
    </form>
    {result.kind === "error" ? <div role="alert" className="mt-8 rounded-2xl border bg-white p-6"><p>Không thể tải danh sách tin. Vui lòng thử lại sau.</p><a href={postListHref(filters, filters.page)} className="mt-3 inline-block underline">Thử lại</a></div> : <>
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.posts.map(post => <PostCard key={post.id} post={post} />)}</div>
      {result.posts.length === 0 && <p className="mt-8 rounded-2xl border border-dashed border-[#b9d7cb] bg-white p-12 text-center text-[#6f817a]">Chưa có tin phù hợp. Thử từ khóa hoặc bộ lọc khác nhé.</p>}
      <nav aria-label="Phân trang tin" className="mt-7 flex flex-wrap items-center justify-center gap-4 text-sm text-[#1c5546]">
        {filters.page > 1 && <Link href={postListHref(filters, Math.min(filters.page - 1, lastPage))}>Trang trước</Link>}
        <span aria-current="page">Trang {filters.page} / {lastPage}</span>
        {filters.page < lastPage && <Link href={postListHref(filters, filters.page + 1)}>Trang sau</Link>}
      </nav>
    </>}
  </div>;
}
