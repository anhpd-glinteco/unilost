import { z } from "zod";
import { postSchema } from "@/lib/validation";

const contentSchema = postSchema.omit({ type: true }).extend({
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return value.slice(0, 4) !== "0000" && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Ngày không hợp lệ"),
});
function trimFields(value: unknown) {
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, field]) =>
    [key, typeof field === "string" ? field.trim() : field]));
}
export const updatePostSchema = z.preprocess(trimFields, contentSchema);
export const createPostSchema = z.preprocess(trimFields, contentSchema.extend({ type: postSchema.shape.type }));

export const foundPostSchema = createPostSchema.refine((post) => post.type === "found");
