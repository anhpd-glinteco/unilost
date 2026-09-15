export type PostType = "lost" | "found";
export type PostStatus = "searching" | "matched" | "verifying" | "returned" | "closed";
export type ModerationState = "published" | "hidden" | "pending";
export type UserRole = "user" | "admin";
export type ClaimStatus = "pending" | "accepted" | "rejected" | "cancelled" | "completed";
export type Post = { id: string; type: PostType; title: string; category: string; color: string; description: string; location: string; occurredAt: string; createdAt: string; status: PostStatus; moderation: ModerationState; ownerName: string; ownerId: string; emoji: string; imageUrl?: string; };
export type ClaimRequest = { id: string; postId: string; requesterName: string; proof: string; status: ClaimStatus; createdAt: string; };
export type MatchCandidate = { post: Post; score: number; reasons: string[] };
