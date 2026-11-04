import { PostCard } from "@/components/post-card";
import { matchPosts } from "@/lib/matching";
import { readMatchCandidates } from "./match-candidates";

export async function MatchSuggestions({ postId }: { postId: string }) {
  const result = await readMatchCandidates(postId);
  const suggestions = result.kind === "ok" ? matchPosts(result.source, result.posts).slice(0, 6) : null;
  return <section aria-labelledby="match-suggestions-title" className="mt-10 min-w-0 space-y-4">
    <h2 id="match-suggestions-title" className="font-serif text-2xl">Gợi ý liên quan</h2>
    {suggestions === null ? <div role="alert" className="rounded-2xl border bg-white p-6">
      <p>Không thể tải gợi ý. Nội dung tin và yêu cầu nhận đồ vẫn có thể sử dụng.</p>
      <a href={`/posts/${postId}`} className="mt-3 inline-block font-semibold underline">Thử lại gợi ý</a>
    </div> : suggestions.length === 0 ? <p role="status">Chưa có gợi ý phù hợp.</p> : <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {suggestions.map(({ post, score, reasons }) => <li key={post.id} className="min-w-0 break-words">
        <PostCard post={post} />
        <p className="mt-3 font-semibold">Điểm phù hợp: {score}/100</p>
        <ul className="mt-1 list-inside list-disc text-sm text-[#5f746d]">{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      </li>)}
    </ul>}
  </section>;
}
