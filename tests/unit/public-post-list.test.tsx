import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { POST_PAGE_SIZE, parsePostFilters, postListHref, readPublicPosts } from "@/features/posts/public-list";
import { SearchShell } from "@/components/search-shell";
const mocks = vi.hoisted(() => ({ client: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), is: vi.fn(), or: vi.fn(), order: vi.fn(), range: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
const row = { id: "12345678-1234-4234-8234-123456789abc", type: "lost", title: "Ví đỏ", category: "Ví", color: "Đỏ", location: "Thư viện", created_at: "2026-10-01T01:00:00Z", moderation: "published", deleted_at: null };
const filters = { q: "", type: "all" as const, category: "", sort: "newest" as const, page: 1 };
beforeEach(() => {
  vi.resetAllMocks(); mocks.client.mockResolvedValue({ from: mocks.from });
  for (const name of ["from", "select", "eq", "is", "or", "order"] as const) mocks[name].mockReturnValue(mocks);
  mocks.range.mockResolvedValue({ data: [row], count: 1, error: null });
});
it("defaults filters and trims Vietnamese search", () => {
  expect(parsePostFilters({}).success).toBe(true);
  expect(parsePostFilters({ q: "  Ví đỏ  " })).toMatchObject({ data: { ...filters, q: "Ví đỏ" } });
});
it.each([{ page: "0" }, { page: "-1" }, { page: "1.5" }, { page: "1e3" }, { page: "9999999" }, { q: ["a", "b"] }, { type: "admin" }, { sort: "title" }, { q: "x".repeat(121) }])("rejects invalid URL filter %j", params => { expect(parsePostFilters(params).success).toBe(false); });
it("queries only published undeleted rows even with an authenticated session", async () => {
  const result = await readPublicPosts(filters);
  expect(result).toMatchObject({ kind: "ok", count: 1, posts: [{ id: row.id, createdAt: row.created_at }] });
  expect(mocks.client).toHaveBeenCalledWith(true);
  expect(mocks.eq).toHaveBeenCalledWith("moderation", "published"); expect(mocks.is).toHaveBeenCalledWith("deleted_at", null);
  expect(mocks.select.mock.calls[0][0]).not.toMatch(/owner|proof|\*/);
  expect(JSON.stringify(result)).not.toMatch(/owner|proof|deleted_at|moderation/);
  expect(mocks.order.mock.calls).toEqual([["created_at", { ascending: false }], ["id", { ascending: false }]]);
  expect(mocks.range).toHaveBeenCalledWith(0, POST_PAGE_SIZE - 1);
});
it("applies type/category, reverse order and offset to the real query", async () => {
  await readPublicPosts({ ...filters, type: "found", category: "Khác", sort: "oldest", page: 3 });
  expect(mocks.eq).toHaveBeenCalledWith("type", "found"); expect(mocks.eq).toHaveBeenCalledWith("category", "Khác");
  expect(mocks.range).toHaveBeenCalledWith(40, 59);
  expect(mocks.order).toHaveBeenCalledWith("id", { ascending: true });
});
it("quotes grammar and LIKE wildcards in keyword operands", async () => {
  await readPublicPosts({ ...filters, q: 'a%,b_(c)"d' });
  const grammar = mocks.or.mock.calls[0][0] as string;
  expect(grammar).toContain('title.ilike."'); expect(grammar).toContain('description.ilike."'); expect(grammar).toContain('location.ilike."');
  expect(grammar).toContain('\\\\%'); expect(grammar).toContain('\\\\_'); expect(grammar).toContain('\\"');
});
it.each([null, { ...row, moderation: "hidden" }, { ...row, deleted_at: "2026-10-02T00:00:00Z" }, { ...row, id: "demo" }])("fails closed for malformed/private result %j", async data => {
  mocks.range.mockResolvedValue({ data: data ? [data] : null, count: 1, error: null });
  expect(await readPublicPosts(filters)).toEqual({ kind: "error" });
});
it.each(["config", "throw", "db", "count"])("returns safe error on %s", async failure => {
  if (failure === "config") mocks.client.mockResolvedValue(null);
  if (failure === "throw") mocks.range.mockRejectedValue(new Error("private secret"));
  if (failure === "db") mocks.range.mockResolvedValue({ data: null, count: 0, error: { message: "secret" } });
  if (failure === "count") mocks.range.mockResolvedValue({ data: [], count: null, error: null });
  expect(await readPublicPosts(filters)).toEqual({ kind: "error" });
});
it("rejects invalid direct callers before querying", async () => {
  expect(await readPublicPosts({ ...filters, page: -1 })).toEqual({ kind: "error" }); expect(mocks.client).not.toHaveBeenCalled();
});
it("serializes filter state safely in pagination and resets page on GET form submit", () => {
  const input = { ...filters, q: '<Ví & "red">', type: "found" as const, category: "Danh mục cũ", sort: "oldest" as const, page: 2 };
  const href = postListHref(input, 3); const parsed = new URL(href, "http://localhost");
  expect(parsed.searchParams.get("q")).toBe(input.q); expect(parsed.searchParams.get("page")).toBe("3");
  const html = renderToStaticMarkup(<SearchShell filters={input} result={{ kind: "ok", posts: [], count: 44 }} />);
  expect(html).toContain('method="get"'); expect(html).not.toContain('name="page"'); expect(html).toContain('aria-label="Sắp xếp"');
  expect(html).toContain("Trang trước"); expect(html).toContain("Trang sau"); expect(html).toContain("&lt;Ví");
});
it("distinguishes no matches from backend failure without demo fallback", () => {
  const empty = renderToStaticMarkup(<SearchShell filters={filters} result={{ kind: "ok", posts: [], count: 0 }} />);
  const error = renderToStaticMarkup(<SearchShell filters={filters} result={{ kind: "error" }} />);
  expect(empty).toContain("Chưa có tin phù hợp"); expect(error).toContain('role="alert"'); expect(error).toContain("Thử lại"); expect(error).not.toContain("0 kết quả");
});
