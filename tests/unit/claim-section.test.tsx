import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClaimSection } from "@/features/claims/claim-section";
const mocks = vi.hoisted(() => ({ context: vi.fn() }));
vi.mock("@/features/claims/queries", () => ({ readClaimFormContext: mocks.context }));
vi.mock("@/features/claims/actions", () => ({ createClaim: vi.fn() }));
const postId = "12345678-1234-4234-8234-123456789abc";
beforeEach(() => vi.clearAllMocks());
it.each(["guest", "ready", "unavailable", "error", "existing"])("renders %s safely", async (kind) => {
  mocks.context.mockResolvedValue({ kind, claim: { id: postId, status: "cancelled" } });
  const html = renderToStaticMarkup(await ClaimSection({ postId }));
  if (kind === "guest") expect(html).toContain(`/auth/login?next=${encodeURIComponent(`/posts/${postId}`)}`);
  if (kind === "ready") { expect(html).toContain('name="proof"'); expect(html).toContain('for="claim-proof"'); }
  else expect(html).not.toContain('name="proof"');
  if (kind === "existing") { expect(html).toContain("Đã hủy"); expect(html).toContain("Mỗi người chỉ gửi một yêu cầu"); }
  if (kind === "error") { expect(html).toContain('role="alert"'); expect(html).toContain("Tải lại trạng thái"); }
  expect(html).not.toContain("owner_id");
});
