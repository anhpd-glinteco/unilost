import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { moderatePost } from "@/features/admin/actions";
import { ModerationControls } from "@/features/admin/moderation-controls";
import { ClaimDecisions } from "@/features/claims/claim-decisions";
const m = vi.hoisted(() => ({ account: vi.fn(), client: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth/account", () => ({ getAccount: m.account }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: m.client }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const id = "00000000-0000-4000-8000-000000000003";
function form(action = "publish") { const data = new FormData(); data.set("postId", id); data.set("action", action); data.set("role", "admin"); return data; }
beforeEach(() => { vi.resetAllMocks(); m.account.mockResolvedValue({ user: { id }, profile: { role: "admin" } }); m.client.mockResolvedValue({ rpc: m.rpc }); m.rpc.mockResolvedValue({ data: id, error: null }); });
it.each(["publish", "hide", "restore"])("whitelists %s RPC input", async action => {
 expect(await moderatePost({ error: "", postId: null }, form(action))).toEqual({ error: "", postId: id });
 expect(m.rpc).toHaveBeenCalledWith("moderate_post", { p_post_id: id, p_action: action });
});
it.each([null, "user"])("rejects non-admin %s before RPC", async role => {
 m.account.mockResolvedValue({ user: { id }, profile: role ? { role } : null });
 expect((await moderatePost({ error: "", postId: null }, form())).error).not.toBe(""); expect(m.rpc).not.toHaveBeenCalled();
});
it("rejects forged action and invalid ID", async () => {
 const invalid = form(); invalid.set("postId", "invalid");
 for (const data of [invalid, form("delete")]) expect((await moderatePost({ error: "", postId: null }, data)).postId).toBeNull();
 expect(m.rpc).not.toHaveBeenCalled();
});
it.each(["transport", "wrong-id", "db"])("does not retry or report uncertain %s as success", async failure => {
 if (failure === "transport") m.rpc.mockRejectedValue(new Error("private"));
 else m.rpc.mockResolvedValue({ data: failure === "wrong-id" ? "other" : null, error: failure === "db" ? { message: "private" } : null });
 const result = await moderatePost({ error: "", postId: null }, form());
 expect(result.error).not.toBe(""); expect(result.error).not.toContain("private"); expect(result.postId).toBeNull(); expect(m.rpc).toHaveBeenCalledTimes(1);
});
it.each([["pending", "Xuất bản"], ["published", "Ẩn tin"], ["hidden", "Khôi phục"]] as const)("renders correct control for %s", (moderation, label) => {
 expect(renderToStaticMarkup(<ModerationControls postId={id} moderation={moderation} />)).toContain(label);
});
it("return control is only available on eligible received accepted claims", () => {
 const html = (group: "sent" | "received", canComplete: boolean) => renderToStaticMarkup(<ClaimDecisions claimId={id} status="accepted" group={group} canAccept={false} canComplete={canComplete} />);
 expect(html("received", true)).toContain("Xác nhận đã trả đồ"); expect(html("sent", true)).not.toContain("Xác nhận đã trả đồ"); expect(html("received", false)).not.toContain("Xác nhận đã trả đồ");
});
