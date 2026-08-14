import { strict as assert } from "node:assert";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { validateBlogPost } from "../src/lib/blog/post-schema.ts";

function validPost(overrides: Record<string, unknown> = {}) {
  return {
    slug: "oneroom-cordless-vacuum",
    title: "원룸 무선청소기, 흡입력보다 먼저 볼 것",
    description:
      "좁은 집에서는 흡입력 숫자보다 소음과 보관 자리가 만족도를 가릅니다. 무엇을 어떻게 확인할지 정리했습니다.",
    categoryId: "appliance",
    publishedAt: "2026-08-14",
    intro: "가".repeat(200),
    criteria: Array.from({ length: 4 }, (_, i) => ({
      name: `기준 ${i + 1}`,
      why: "나".repeat(50),
      how: "다".repeat(50),
    })),
    mistakes: Array.from({ length: 3 }, () => "라".repeat(30)),
    checklist: Array.from({ length: 4 }, () => "마".repeat(20)),
    faq: Array.from({ length: 3 }, (_, i) => ({
      question: `질문 ${i + 1}`,
      answer: "바".repeat(70),
    })),
    ...overrides,
  };
}

test("기준을 모두 채운 글은 통과한다", () => {
  const result = validateBlogPost(validPost());
  assert.equal(result.ok, true);
});

test("분량이 모자라면 반려하고 이유를 모아 준다", () => {
  const result = validateBlogPost(
    validPost({ intro: "짧은 도입부", mistakes: ["짧음"] })
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.problems.some((p) => p.includes("intro")));
  assert.ok(result.problems.some((p) => p.includes("mistakes")));
  // 한 번에 여러 문제를 돌려줘야 모델이 한 번의 재시도로 고칠 수 있다.
  assert.ok(result.problems.length >= 2);
});

test("지어낸 수치가 있으면 반려한다", () => {
  // 자동 생성 글에서 가장 흔한 실패다. 확인할 방법이 없는 숫자는 막는다.
  for (const intro of [
    `${"가".repeat(200)} 10만 명이 선택한 제품입니다.`,
    `${"가".repeat(200)} 만족도 98% 를 기록했습니다.`,
    `${"가".repeat(200)} 구매자의 80% 가 만족했습니다.`,
    `${"가".repeat(200)} 전문가 추천 제품입니다.`,
  ]) {
    const result = validateBlogPost(validPost({ intro }));
    assert.equal(result.ok, false, `막지 못함: ${intro.slice(-25)}`);
  }
});

test("규격처럼 확인 가능한 숫자는 막지 않는다", () => {
  const result = validateBlogPost(
    validPost({
      intro: `${"가".repeat(200)} 소음은 dB 로 표기되며 60dB 이상이면 대화가 어렵습니다.`,
    })
  );
  assert.equal(result.ok, true);
});

test("slug 형식과 카테고리를 검사한다", () => {
  assert.equal(validateBlogPost(validPost({ slug: "한글슬러그" })).ok, false);
  assert.equal(validateBlogPost(validPost({ slug: "Bad_Slug" })).ok, false);
  assert.equal(validateBlogPost(validPost({ categoryId: "unknown" })).ok, false);
});

test("객체가 아니면 반려한다", () => {
  assert.equal(validateBlogPost(null).ok, false);
  assert.equal(validateBlogPost("글").ok, false);
});

test("저장소에 실린 글은 모두 기준을 통과한다", async () => {
  // 손으로 고치다 형식이 깨진 글이 발행되는 것을 막는다.
  const dir = path.join(process.cwd(), "content/blog/posts");
  if (!existsSync(dir)) return;

  const files = (await readdir(dir)).filter((name) => name.endsWith(".json"));
  for (const name of files) {
    const raw = JSON.parse(await readFile(path.join(dir, name), "utf8"));
    const result = validateBlogPost(raw);
    assert.equal(
      result.ok,
      true,
      `${name} 기준 미달:\n  - ${result.ok ? "" : result.problems.join("\n  - ")}`
    );
  }
});
