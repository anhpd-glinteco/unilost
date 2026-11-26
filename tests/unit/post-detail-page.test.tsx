import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PostDetail from "@/app/posts/[id]/page";

const mocks = vi.hoisted(() => ({ readPost: vi.fn() }));
vi.mock("@/features/posts/queries", () => ({ readPost: mocks.readPost }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); } }));

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
