import Link from "next/link";
import { SearchShell } from "@/components/search-shell";
import { SiteHeader } from "@/components/site-header";
import { parsePostFilters, readPublicPosts } from "@/features/posts/public-list";
export const metadata = { title: "Tìm đồ" };
export const dynamic = "force-dynamic";
export default async function PostsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parsed = parsePostFilters(await searchParams);
  return <div className="min-h-screen bg-[#f7f8f4]"><SiteHeader /><main className="mx-auto max-w-7xl px-5 py-10 md:px-10 md:py-14"><div className="mb-8"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#d87642]">Kho tin cộng đồng</p><h1 className="mt-2 font-serif text-5xl">Tìm lại món đồ của bạn</h1><p className="mt-3 max-w-2xl text-[#6f817a]">Tìm kiếm trong các tin mất đồ và đồ nhặt được quanh khuôn viên trường.</p></div>{parsed.success ? <SearchShell filters={parsed.data} result={await readPublicPosts(parsed.data)} /> : <section role="alert"><p>Bộ lọc không hợp lệ.</p><Link href="/posts" className="underline">Đặt lại bộ lọc</Link></section>}</main></div>;
}
