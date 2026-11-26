import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MatchSuggestions } from "@/features/posts/match-suggestions";
const m = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/features/posts/match-candidates", () => ({ readMatchCandidates: m.read }));
const post = { id: "source", type: "lost" as const, title: "Điện thoại trường", category: "Khác", color: "đen", description: "", location: "Thư viện", occurredAt: "2026-10-01", createdAt: "2026-10-01T00:00:00Z", status: "searching" as const, moderation: "published" as const, emoji: "📦" };
beforeEach(() => vi.resetAllMocks());
it("uses actual scorer, limits to six and keeps rank and safe card links", async () => {
  m.read.mockResolvedValue({ kind: "ok", source: post, posts: Array.from({ length: 8 }, (_, i) => ({ ...post, id: `id-${7-i}`, type: "found" })) });
  const html = renderToStaticMarkup(await MatchSuggestions({ postId: post.id }));
  expect(m.read).toHaveBeenCalledWith(post.id); expect(html.match(/Điểm phù hợp:/g)).toHaveLength(6);
  expect(html).toContain("100/100"); expect(html).toContain("cùng danh mục"); expect(html).toContain("mô tả có từ khóa trùng");
  expect(html.indexOf('/posts/id-0')).toBeLessThan(html.indexOf('/posts/id-1')); expect(html).not.toContain('/posts/id-6');
  expect(html).not.toMatch(/owner|proof|storage_path/);
});
it.each(["error", "missing"])("shows recoverable %s without demo", async kind => {
  m.read.mockResolvedValue({ kind }); const html = renderToStaticMarkup(await MatchSuggestions({ postId: post.id }));
  expect(html).toContain('role="alert"'); expect(html).toContain('href="/posts/source"'); expect(html).not.toContain("Điểm phù hợp:");
});
it("shows empty separately and excludes hidden, pending and ended candidates", async () => {
  m.read.mockResolvedValue({ kind: "ok", source: post, posts: [ { ...post, type: "found", moderation: "hidden" }, { ...post, type: "found", moderation: "pending" }, ...["verifying", "returned", "closed"].map(status => ({ ...post, id: status, type: "found", status })) ] });
  const html = renderToStaticMarkup(await MatchSuggestions({ postId: post.id })); expect(html).toContain("Chưa có gợi ý phù hợp"); expect(html).not.toContain('role="alert"');
});
it("escapes public text including long titles", async () => {
  m.read.mockResolvedValue({ kind: "ok", source: post, posts: [{ ...post, id: "other", type: "found", title: '<script>unsafe</script>' + 'x'.repeat(300) }] });
  const html = renderToStaticMarkup(await MatchSuggestions({ postId: post.id })); expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>');
});
