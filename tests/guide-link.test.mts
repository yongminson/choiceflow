import assert from "node:assert/strict";
import test from "node:test";

import {
  pickGuideLinks,
  toGuideLinks,
  type GuideLink,
} from "../src/lib/blog/guide-link.ts";

const links: GuideLink[] = [
  { slug: "a", title: "가전 글", description: "설명", categoryId: "appliance" },
  { slug: "b", title: "선물 글", description: "설명", categoryId: "gift" },
  { slug: "c", title: "가전 글 2", description: "설명", categoryId: "appliance" },
  { slug: "d", title: "패션 글", description: "설명", categoryId: "fashion" },
];

test("같은 분야 글을 먼저 고른다", () => {
  const picked = pickGuideLinks(links, "appliance", 3);
  assert.deepEqual(
    picked.slice(0, 2).map((item) => item.slug),
    ["a", "c"]
  );
});

test("같은 분야가 모자라면 다른 글로 채운다", () => {
  const picked = pickGuideLinks(links, "fashion", 3);
  assert.equal(picked.length, 3);
  assert.equal(picked[0].slug, "d");
});

test("분야를 모르면 최근 글을 그대로 쓴다", () => {
  const picked = pickGuideLinks(links, undefined, 2);
  assert.deepEqual(
    picked.map((item) => item.slug),
    ["a", "b"]
  );
});

test("고른 글은 요청한 개수를 넘지 않는다", () => {
  assert.equal(pickGuideLinks(links, "appliance", 2).length, 2);
});

test("링크에는 본문이 실리지 않는다", () => {
  const [link] = toGuideLinks([
    {
      slug: "a",
      title: "제목",
      description: "설명",
      categoryId: "gift",
      publishedAt: "2026-01-01",
      intro: "본문",
      criteria: [],
      mistakes: [],
      checklist: [],
      faq: [],
    },
  ]);
  assert.deepEqual(Object.keys(link).sort(), [
    "categoryId",
    "description",
    "slug",
    "title",
  ]);
});
