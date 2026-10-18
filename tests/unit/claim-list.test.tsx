import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClaimList, claimsListHref } from "@/features/claims/claim-list";
import ClaimsPage from "@/app/dashboard/claims/page";
import { claimStatusLabels } from "@/features/claims/claim-status";
import type { ClaimStatus } from "@/lib/types";
const mocks = vi.hoisted(() => ({ list: vi.fn(), account: vi.fn() }));
vi.mock("@/features/claims/queries", async original => ({ ...await original<typeof import("@/features/claims/queries")>(), readClaimList: mocks.list }));
vi.mock("@/lib/auth/account", () => ({ requireAccount: mocks.account }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => <header>Header</header> }));
const id = "12345678-1234-4234-8234-123456789abc";
const row = { id, post_id: id, requester_id: id, proof: '<script>alert("fake")</script>', status: "pending", created_at: "2026-10-18T23:30:00Z", posts: { id, owner_id: id, title: "Fake post", deleted_at: null } };
const pages = { sentPage: 2, receivedPage: 3 };
beforeEach(() => { vi.resetAllMocks(); mocks.list.mockResolvedValue({ kind: "ready", claims: [row], hasNext: false }); });
it.each(Object.keys(claimStatusLabels) as ClaimStatus[])("renders %s and escaped collapsed proof", async status => {
  mocks.list.mockResolvedValue({ kind: "ready", claims: [{ ...row, status }], hasNext: false });
  const html = renderToStaticMarkup(await ClaimList({ group: "sent", pages }));
  expect(html).toContain(claimStatusLabels[status]);
  expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>");
  expect(html).toContain("<details class="); expect(html).not.toContain(" open=");
  expect(html).toContain("<summary"); expect(html).toContain("19 thg 10, 2026");
  expect(html).toContain(`/posts/${id}`); expect(html).not.toContain("<button");
});
it.each(["sent", "received"] as const)("paginates %s while preserving other page", async group => {
  mocks.list.mockResolvedValue({ kind: "ready", claims: [row], hasNext: true });
  const html = renderToStaticMarkup(await ClaimList({ group, pages }));
  expect(html).toContain(group === "sent" ? "sentPage=3&amp;receivedPage=3" : "sentPage=2&amp;receivedPage=4");
  expect(html).toContain(group === "sent" ? "sentPage=1&amp;receivedPage=3" : "sentPage=2&amp;receivedPage=2");
});
it.each([null, { ...row.posts, deleted_at: "2026-10-18T10:00:00Z" }])("shows unavailable post without link %j", async posts => {
  mocks.list.mockResolvedValue({ kind: "ready", claims: [{ ...row, posts }] });
  const html = renderToStaticMarkup(await ClaimList({ group: "sent", pages }));
  expect(html).toContain("Tin không còn khả dụng"); expect(html).not.toContain(`/posts/${id}`);
  expect(html).toContain("&lt;script&gt;");
});
it.each(["sent", "received"] as const)("renders first-page empty %s", async group => {
  mocks.list.mockResolvedValue({ kind: "ready", claims: [], hasNext: false });
  const html = renderToStaticMarkup(await ClaimList({ group, pages: { sentPage: 1, receivedPage: 1 } }));
  expect(html).toContain(group === "sent" ? "Bạn chưa gửi" : "Bạn chưa nhận"); expect(html).not.toContain("Trang trước"); expect(html).not.toContain("Trang sau");
});
it("keeps back navigation on empty later page", async () => {
  mocks.list.mockResolvedValue({ kind: "ready", claims: [], hasNext: false });
  const html = renderToStaticMarkup(await ClaimList({ group: "sent", pages }));
  expect(html).toContain("Không có yêu cầu ở trang này"); expect(html).toContain("Trang trước");
});
it("isolates errors and preserves retry parameters", async () => {
  mocks.list.mockResolvedValueOnce({ kind: "error" }).mockResolvedValueOnce({ kind: "ready", claims: [row] });
  const failed = renderToStaticMarkup(await ClaimList({ group: "sent", pages }));
  const ready = renderToStaticMarkup(await ClaimList({ group: "received", pages }));
  expect(failed).toContain('role="alert"'); expect(failed).toContain("sentPage=2&amp;receivedPage=3");
  expect(ready).toContain("Fake post");
});
it("preserves canonical return path and uses independent loading boundaries", async () => {
  const element = await ClaimsPage({ searchParams: Promise.resolve({ sentPage: "2", receivedPage: "invalid" }) });
  expect(mocks.account).toHaveBeenCalledWith(claimsListHref({ sentPage: 2, receivedPage: 1 }));
  const sections = element.props.children[1].props.children[3];
  expect(sections).toHaveLength(2);
  for (const section of sections) expect(renderToStaticMarkup(section.props.children[1].props.fallback)).toContain('role="status"');
});
it("does not render page when account guard redirects guest", async () => {
  mocks.account.mockRejectedValue(new Error("redirect"));
  await expect(ClaimsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect");
  expect(mocks.list).not.toHaveBeenCalled();
});
