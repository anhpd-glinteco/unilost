import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PostsPage from "@/app/posts/page";
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/features/posts/public-list", async importOriginal => ({ ...await importOriginal<typeof import("@/features/posts/public-list")>(), readPublicPosts: mocks.read }));
beforeEach(() => { vi.resetAllMocks(); });
it("renders actual query results and passes URL state to the query", async () => {
  mocks.read.mockResolvedValue({ kind: "ok", count: 1, posts: [{ id: "12345678-1234-4234-8234-123456789abc", type: "lost", title: "Live fixture", category: "Khác", color: "Đỏ", location: "Test", createdAt: "2026-01-01T00:00:00Z", emoji: "📦" }] });
  const html = renderToStaticMarkup(await PostsPage({ searchParams: Promise.resolve({ type: "lost", page: "2" }) }));
  expect(mocks.read).toHaveBeenCalledWith(expect.objectContaining({ type: "lost", page: 2 }));
  expect(html).toContain("Live fixture"); expect(html).not.toContain("p-001");
});
it("rejects ambiguous or invalid URL state before querying", async () => {
  const html = renderToStaticMarkup(await PostsPage({ searchParams: Promise.resolve({ page: ["1", "2"] }) }));
  expect(html).toContain("Bộ lọc không hợp lệ"); expect(mocks.read).not.toHaveBeenCalled();
});
it("does not replace a database error with mock posts", async () => {
  mocks.read.mockResolvedValue({ kind: "error" });
  const html = renderToStaticMarkup(await PostsPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("Không thể tải danh sách tin"); expect(html).not.toContain("p-001");
});
