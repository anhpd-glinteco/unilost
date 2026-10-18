import Link from "next/link";
import { readClaimFormContext } from "./queries";
import { CreateClaimForm } from "./create-claim-form";
import { claimStatusLabels } from "./claim-status";

export async function ClaimSection({ postId }: { postId: string }) {
  const context = await readClaimFormContext(postId);
  if (context.kind === "ready") return <CreateClaimForm postId={postId} />;
  if (context.kind === "guest") return <Link className="mt-8 inline-block font-semibold text-[#1c5546] underline" href={`/auth/login?next=${encodeURIComponent(`/posts/${postId}`)}`}>Đăng nhập để yêu cầu nhận đồ</Link>;
  if (context.kind === "existing") return <section role="status" className="mt-8 space-y-2 rounded-2xl border bg-white p-6 text-sm">
    <h2 className="text-xl font-semibold">Yêu cầu nhận đồ của bạn</h2>
    <p>Trạng thái: {claimStatusLabels[context.claim.status]}</p><p className="break-all">Mã yêu cầu: {context.claim.id}</p>
    <p>Mỗi người chỉ gửi một yêu cầu cho mỗi tin, kể cả sau khi hủy hoặc bị từ chối.</p>
  </section>;
  if (context.kind === "error") return <section role="alert" className="mt-8 space-y-2"><p>Không thể tải trạng thái yêu cầu nhận đồ.</p><a href={`/posts/${postId}`} className="underline">Tải lại trạng thái</a></section>;
  return <p className="mt-8 text-sm text-[#5f746d]">Bạn không thể gửi yêu cầu nhận đồ cho tin này.</p>;
}
