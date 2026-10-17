import { z } from "zod";
import { postSchema } from "@/lib/validation";

export const foundPostSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, field]) =>
    [key, typeof field === "string" ? field.trim() : field]));
}, postSchema.extend({
  type: z.literal("found"),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return value.slice(0, 4) !== "0000" && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Ngày không hợp lệ"),
}));
