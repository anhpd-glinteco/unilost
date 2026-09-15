import { z } from "zod";
export const postSchema = z.object({ type: z.enum(["lost", "found"]), title: z.string().min(4).max(100), category: z.string().min(1), color: z.string().min(1).max(40), description: z.string().min(20).max(1000), location: z.string().min(2).max(120), occurredAt: z.string().min(1) });
export const claimSchema = z.object({ proof: z.string().min(10).max(1000) });
export type PostInput = z.infer<typeof postSchema>;
