import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAccount } from "@/lib/auth/account";
import { SiteHeader } from "@/components/site-header";
import { ClaimList, claimsListHref } from "@/features/claims/claim-list";
import { parseClaimsPage } from "@/features/claims/queries";

export const metadata = { title: "Yêu cầu nhận đồ", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const pages = { sentPage: parseClaimsPage(params.sentPage), receivedPage: parseClaimsPage(params.receivedPage) };
  await requireAccount(claimsListHref(pages));
  return <div className="min-h-screen bg-[#f7f8f4]">
    <SiteHeader />
    <main className="mx-auto max-w-4xl px-5 py-10 md:px-10 md:py-14">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f746d]"><ArrowLeft size={16} /> Bảng tin của tôi</Link>
      <h1 className="mt-8 font-serif text-4xl md:text-5xl">Yêu cầu nhận đồ</h1>
      <p className="mt-3 text-[#6f817a]">Theo dõi yêu cầu bạn đã gửi và nhận trên tin của mình.</p>
      {(["sent", "received"] as const).map(group => <section key={group} aria-labelledby={`${group}-heading`} className="mt-10">
        <h2 id={`${group}-heading`} className="font-serif text-3xl">{group === "sent" ? "Đã gửi" : "Đã nhận"}</h2>
        <Suspense key={`${group}-${pages.sentPage}-${pages.receivedPage}`} fallback={<p role="status" className="mt-4">Đang tải yêu cầu {group === "sent" ? "đã gửi" : "đã nhận"}…</p>}>
          <ClaimList group={group} pages={pages} />
        </Suspense>
      </section>)}
    </main>
  </div>;
}
