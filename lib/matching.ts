import type { MatchCandidate, MatchPost } from "./types";
function tokens(text: string) {
  return new Set(text.normalize("NFC").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 3));
}
export function matchPosts(source: MatchPost, candidates: MatchPost[]): MatchCandidate[] {
  const words = tokens(`${source.title} ${source.description}`);
  return candidates.filter(post => post.id !== source.id && post.type !== source.type && post.moderation === "published" && ["searching", "matched"].includes(post.status)).map(post => {
    let score = 0;
    const reasons: string[] = [];
    if (post.category === source.category) { score += 35; reasons.push("cùng danh mục"); }
    if (post.color.toLowerCase() === source.color.toLowerCase()) { score += 20; reasons.push("cùng màu sắc"); }
    if (post.location === source.location) { score += 20; reasons.push("cùng địa điểm"); }
    const other = tokens(`${post.title} ${post.description}`);
    const shared = [...words].filter(word => other.has(word));
    if (shared.length) { score += Math.min(shared.length * 5, 15); reasons.push("mô tả có từ khóa trùng"); }
    if (source.occurredAt === post.occurredAt) { score += 10; reasons.push("cùng ngày"); }
    return { post, score, reasons };
  }).filter(item => item.score >= 25).sort((a, b) => b.score - a.score || (a.post.id < b.post.id ? -1 : a.post.id > b.post.id ? 1 : 0));
}
