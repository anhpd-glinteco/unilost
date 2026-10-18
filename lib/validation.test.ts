import { describe, expect, it } from "vitest";
import { claimSchema, postSchema, type ClaimInput } from "./validation";
describe("postSchema", () => { it("accepts a complete post", () => { expect(postSchema.safeParse({ type: "lost", title: "Ví da màu nâu", category: "Ví & giấy tờ", color: "Nâu", description: "Ví có sticker nhỏ ở mặt trong và một vết xước.", location: "Tòa B", occurredAt: "2026-09-15" }).success).toBe(true); }); it("rejects short descriptions", () => { expect(postSchema.safeParse({ type: "lost", title: "Ví da", category: "Ví", color: "Nâu", description: "ngắn", location: "B", occurredAt: "" }).success).toBe(false); }); });

describe("claimSchema", () => {
  it("trims proof while preserving its internal content", () => {
    const input: ClaimInput = { proof: " \nCó vết xước  hình chữ L ở hộp sạc.\t " };
    expect(claimSchema.parse(input)).toEqual({ proof: "Có vết xước  hình chữ L ở hộp sạc." });
  });

  it.each([9, 10, 1000, 1001])("checks length %i after trimming", (length) => {
    const result = claimSchema.safeParse({ proof: ` \n${"a".repeat(length)}\t ` });
    expect(result.success).toBe(length >= 10 && length <= 1000);
    if (result.success) expect(result.data.proof).toHaveLength(length);
  });

  it("rejects whitespace-only proof", () => {
    expect(claimSchema.safeParse({ proof: " \t\n".repeat(10) }).success).toBe(false);
  });

  it.each([{}, { proof: null }, { proof: 1234567890 }, { proof: [] }, null, "valid length proof"])(
    "rejects invalid input %j",
    (input) => expect(claimSchema.safeParse(input).success).toBe(false),
  );
});
