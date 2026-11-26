import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PostImage } from "@/features/posts/post-image";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

it.each([false, true])("renders loading with write controls only for an authorized owner: %s", manageable => {
  const html = renderToStaticMarkup(<PostImage postId="12345678-1234-4234-8234-123456789abc" manageable={manageable} />);
  expect(html).toContain('aria-label="Ảnh món đồ"');
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain("Đang tải ảnh");
  expect(html.includes('type="file"')).toBe(manageable);
  if (manageable) {
    expect(html).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(html).toMatch(/type="file"[^>]*disabled/);
  }
  expect(html).not.toContain("supabase.co");
  expect(html).not.toContain('src="/api/');
});
