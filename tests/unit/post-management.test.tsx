import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PostManagement } from "@/features/posts/post-management";
import type { PostStatus } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/posts/actions", () => ({ updatePost: vi.fn(), closePost: vi.fn() }));
const post = { id: "12345678-1234-4234-8234-123456789abc", type: "lost" as const, status: "searching" as PostStatus, title: "Ví màu đen", category: "Ví", color: "Đen", description: "Ví có miếng dán ngôi sao màu vàng.", location: "Thư viện", occurred_at: "2026-10-20" };

it.each(["searching", "matched", "verifying", "returned", "closed"] as const)("allows controls only on editable status %s", status => {
  const html = renderToStaticMarkup(<PostManagement post={{ ...post, status }} />);
  expect(html.includes(">Sửa tin</button>")).toBe(["searching", "matched"].includes(status));
  expect(html.includes(">Đóng tin</button>")).toBe(["searching", "matched"].includes(status));
  expect(html).not.toContain("owner_id");
});
