import { describe, expect, it } from "vitest";
import { matchPosts } from "./matching";
import { featuredPosts } from "./mock-data";
describe("matchPosts", () => { it("only returns opposite post types with explainable scores", () => { const candidate = { ...featuredPosts[1], category: featuredPosts[0].category, color: featuredPosts[0].color, location: featuredPosts[0].location }; const result = matchPosts(featuredPosts[0], [...featuredPosts, candidate]); expect(result.every((item) => item.post.type !== featuredPosts[0].type)).toBe(true); expect(result[0]?.reasons.length).toBeGreaterThan(0); }); it("filters weak candidates", () => { const result = matchPosts({ ...featuredPosts[0], category: "Khác", color: "Tím", location: "Cổng trường", occurredAt: "2020-01-01" }, featuredPosts); expect(result).toHaveLength(0); }); });

const source = { ...featuredPosts[0], id: "source", type: "lost" as const, title: "điện thoại trường", description: "", category: "a", color: "a", location: "a", occurredAt: "2026-01-01" };
const opposite = { ...source, id: "b", type: "found" as const, moderation: "published" as const, status: "searching" as const };
it("normalizes Vietnamese and counts unique whole words, with maximum 100", () => {
  expect(matchPosts(source, [{ ...opposite, title: source.title.normalize("NFD") }])[0].score).toBe(100);
  const one = { ...source, title: "điện điện điện", description: "" };
  expect(matchPosts(one, [{ ...opposite, title: "điện" }])[0].score).toBe(90);
  expect(matchPosts(one, [{ ...opposite, title: "điệnthoại" }])[0].score).toBe(85);
});
it("keeps threshold 25 inclusive and sorts ties by ID", () => {
  const weak = { ...opposite, title: "điện", category: "b", location: "b", occurredAt: "2020-01-01" };
  expect(matchPosts(source, [weak])[0].score).toBe(25);
  expect(matchPosts(source, [{ ...weak, title: "none" }])).toEqual([]);
  expect(matchPosts(source, [opposite, { ...opposite, id: "a" }]).map(item => item.post.id)).toEqual(["a", "b"]);
});
it.each(["verifying", "returned", "closed"] as const)("excludes %s", status => {
  expect(matchPosts(source, [{ ...opposite, status }])).toEqual([]);
});
it("rejects same type, self, hidden and pending", () => {
  expect(matchPosts(source, [source, { ...opposite, id: source.id }, { ...opposite, moderation: "hidden" }, { ...opposite, moderation: "pending" }])).toEqual([]);
});
