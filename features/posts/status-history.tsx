import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const status = z.enum(["searching", "matched", "verifying", "returned", "closed"]);
const rowsSchema = z.array(z.object({ id: z.string().uuid(), from_status: status.nullable(), to_status: status, created_at: z.string().datetime({ offset: true }) }));
const labels = { searching: "Đang tìm", matched: "Có gợi ý", verifying: "Đang xác minh", returned: "Đã trả", closed: "Đã đóng" };
async function readHistory(postId: string) {
  try {
    const client = await createSupabaseServerClient(true);
    const result = await client?.from("status_history").select("id,from_status,to_status,created_at").eq("post_id", postId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(20);
    const rows = rowsSchema.safeParse(result?.data);
    if (!result || result.error || !rows.success) throw new Error("History unavailable");
    return rows.data;
  } catch { return null; }
}

export async function StatusHistory({ postId }: { postId: string }) {
  const rows = await readHistory(postId);
  if (!rows) return <p role="alert">Không thể tải lịch sử tiến độ.</p>;
  return <section className="mt-6 space-y-3" aria-label="Lịch sử tiến độ"><h2 className="font-serif text-2xl">Lịch sử tiến độ</h2>{!rows.length && <p>Chưa có lịch sử.</p>}<ul>{rows.map(row => <li key={row.id}>{row.from_status ? labels[row.from_status] + " → " : ""}{labels[row.to_status]} · <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</time></li>)}</ul></section>;
}
