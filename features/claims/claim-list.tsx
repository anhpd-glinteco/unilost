import Link from "next/link";
import { claimStatusLabels } from "./claim-status";
import { readClaimList, type ClaimListGroup } from "./queries";

type Pages = { sentPage: number; receivedPage: number };
const claimDate = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });
export function claimsListHref(pages: Pages) {
  return `/dashboard/claims?sentPage=${pages.sentPage}&receivedPage=${pages.receivedPage}`;
}

export async function ClaimList({ group, pages }: { group: ClaimListGroup; pages: Pages }) {
  const pageKey = group === "sent" ? "sentPage" : "receivedPage";
  const page = pages[pageKey];
  const result = await readClaimList(group, page);
  if (result.kind === "error") return <div role="alert" className="mt-4 rounded-xl border border-[#dfe9e2] bg-white p-5">
    <p>Không thể tải yêu cầu. Vui lòng thử lại sau.</p>
    <a href={claimsListHref(pages)} className="mt-2 inline-block underline">Thử lại mục {group === "sent" ? "Đã gửi" : "Đã nhận"}</a>
  </div>;
  return <>
    {result.claims.length === 0 && <p className="mt-4 text-[#5f746d]">{page > 1 ? "Không có yêu cầu ở trang này." : group === "sent" ? "Bạn chưa gửi yêu cầu nhận đồ nào." : "Bạn chưa nhận yêu cầu nhận đồ nào."}</p>}
    <div className="mt-4 space-y-4">{result.claims.map(claim => <article key={claim.id} className="min-w-0 rounded-2xl border border-[#dfe9e2] bg-white p-5 md:p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <h3 className="min-w-0 break-words font-serif text-2xl">{claim.posts && !claim.posts.deleted_at
          ? <Link className="underline decoration-[#dfe9e2] underline-offset-4" href={`/posts/${claim.post_id}`}>{claim.posts.title}</Link>
          : "Tin không còn khả dụng"}</h3>
        <span className="w-fit shrink-0 rounded-full bg-[#e7f2ec] px-3 py-1.5 text-xs font-bold text-[#28725c]">{claimStatusLabels[claim.status]}</span>
      </div>
      <p className="mt-3 break-all text-xs text-[#5f746d]">Mã yêu cầu: {claim.id}</p>
      <p className="mt-1 text-sm text-[#5f746d]">Ngày gửi: <time dateTime={claim.created_at}>{claimDate.format(new Date(claim.created_at))}</time></p>
      <details className="mt-4 rounded-xl bg-[#f7f8f4] p-4 text-sm text-[#5f746d]">
        <summary className="cursor-pointer font-semibold">Bằng chứng nhận đồ</summary>
        <p className="mt-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{claim.proof}</p>
      </details>
    </article>)}</div>
    <nav aria-label={`Phân trang ${group === "sent" ? "đã gửi" : "đã nhận"}`} className="mt-5 flex flex-wrap items-center gap-4 text-sm text-[#1c5546]">
      {page > 1 && <Link className="underline" href={claimsListHref({ ...pages, [pageKey]: page - 1 })}>Trang trước</Link>}
      <span>Trang {page}</span>
      {result.hasNext && <Link className="underline" href={claimsListHref({ ...pages, [pageKey]: page + 1 })}>Trang sau</Link>}
    </nav>
  </>;
}
