import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PostDetail from "@/app/posts/[id]/page";

const mocks = vi.hoisted(() => ({ readPost: vi.fn(), canManagePost: vi.fn() }));
vi.mock("@/features/posts/queries", () => ({ readPost: mocks.readPost, canManagePost: mocks.canManagePost }));
vi.mock("@/features/posts/post-management", () => ({ PostManagement: () => <section>Owner controls</section> }));
vi.mock("@/features/posts/post-image", () => ({ PostImage: ({ postId, manageable }: { postId: string; manageable: boolean }) => <section data-image-post={postId} data-image-manageable={manageable} /> }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/features/claims/claim-section", () => ({ ClaimSection: ({ postId }: { postId: string }) => <section data-claim-post={postId}>Claim form</section> }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); } }));
beforeEach(() => vi.resetAllMocks());

it("renders safe load error and a retry link without demo content", async () => {
  mocks.readPost.mockResolvedValue({ kind: "error" });
  const html = renderToStaticMarkup(await PostDetail({ params: Promise.resolve({ id: "12345678-1234-4234-8234-123456789abc" }) }));
  expect(html).toContain("Không thể tải tin");
  expect(html).toContain('role="alert"');
  expect(html).toContain('href="/posts/12345678-1234-4234-8234-123456789abc"');
  expect(html).not.toContain("Gợi ý liên quan");
});

it("uses framework 404 for inaccessible rows", async () => {
  mocks.readPost.mockResolvedValue({ kind: "missing" });
  await expect(PostDetail({ params: Promise.resolve({ id: "p-001" }) })).rejects.toThrow("not-found");
});

it("mounts the claim section for the actual loaded post", async () => {
  const id = "12345678-1234-4234-8234-123456789abc";
  mocks.readPost.mockResolvedValue({ kind: "found", post: { id, type: "found", title: "Keys", description: "Found keys", location: "Library", occurred_at: "2026-01-01", category: "keys", color: "black", status: "searching", moderation: "published" } });
  const html = renderToStaticMarkup(await PostDetail({ params: Promise.resolve({ id }) }));
  expect(html).toContain(`data-claim-post="${id}"`);
  expect(html).not.toContain("Yêu cầu nhận đồ chưa khả dụng");
});

it.each([true, false])("renders management only after server ownership check: %s", async canManage => {
  const id = "12345678-1234-4234-8234-123456789abc";
  mocks.readPost.mockResolvedValue({ kind: "found", post: { id, type: "lost", title: "Keys", description: "Lost keys", location: "Library", occurred_at: "2026-01-01", category: "keys", color: "black", status: "searching", moderation: "published" } });
  mocks.canManagePost.mockResolvedValue(canManage);
  const html = renderToStaticMarkup(await PostDetail({ params: Promise.resolve({ id }) }));
  expect(html.includes("Owner controls")).toBe(canManage);
  expect(mocks.canManagePost).toHaveBeenCalledWith(id);
});


it.each([
  [true, "searching", true], [true, "matched", true],
  [true, "verifying", false], [true, "returned", false], [true, "closed", false],
  [false, "searching", false], [false, "matched", false],
] as const)("image writes require ownership and mutable status: %s/%s", async (owner, status, expected) => {
  const id = "12345678-1234-4234-8234-123456789abc";
  mocks.readPost.mockResolvedValue({ kind: "found", post: { id, type: "found", title: "Keys", description: "Fixture", location: "Library", occurred_at: "2026-01-01", category: "keys", color: "black", status, moderation: "published" } });
  mocks.canManagePost.mockResolvedValue(owner);
  const html = renderToStaticMarkup(await PostDetail({ params: Promise.resolve({ id }) }));
  expect(html).toContain(`data-image-manageable="${expected}"`);
  expect(html.match(/data-image-post=/g)).toHaveLength(1);
  expect(html).toContain(`data-claim-post="${id}"`);
});
