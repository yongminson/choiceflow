import { strict as assert } from "node:assert";
import test from "node:test";

import {
  alignLabelsWithPrice,
  dropUnmatchedWhenOthersMatched,
} from "../src/lib/recommendation/selection-labels.ts";
import type { QuickRecommendation } from "../src/lib/types/analyze.ts";

const LABELS = {
  best: "가장 추천",
  value: "가성비 선택",
  reliable: "검증 우선",
  premium: "한 단계 위",
} as const;

function candidate(
  selectionType: "best" | "value" | "reliable" | "premium",
  price?: number,
  priceScore?: number
): QuickRecommendation {
  return {
    rank: 1,
    // 이름으로 원래 어느 자리에 있던 후보인지 추적한다.
    name: `${selectionType}-${price ?? "무가격"}`,
    reason: "",
    searchKeyword: "",
    qualitySummary: "",
    selectionType,
    selectionLabel: LABELS[selectionType],
    price,
    scores:
      priceScore === undefined
        ? undefined
        : [
            { label: "받는 사람 만족", value: 90 },
            { label: "가격 부담", value: priceScore },
          ],
  };
}

function labelAt(items: QuickRecommendation[], price: number) {
  return items.find((item) => item.price === price)?.selectionLabel;
}

function priceScoreAt(items: QuickRecommendation[], price: number) {
  return items
    .find((item) => item.price === price)
    ?.scores?.find((score) => score.label === "가격 부담")?.value;
}

test("가성비는 최저가에, 한 단계 위는 최고가에 붙는다", () => {
  // 실제로 나갔던 화면이다. "가성비 선택"이 69,900원(최고가)이고
  // "한 단계 위"가 21,900원(최저가)이었다.
  const aligned = alignLabelsWithPrice([
    candidate("best", 44800),
    candidate("value", 69900),
    candidate("reliable", 52800),
    candidate("premium", 21900),
  ]);

  assert.equal(labelAt(aligned, 21900), "가성비 선택");
  assert.equal(labelAt(aligned, 69900), "한 단계 위");
  // AI 가 1순위로 고른 후보는 가격과 무관하게 그대로 둔다.
  assert.equal(labelAt(aligned, 44800), "가장 추천");
  assert.equal(labelAt(aligned, 52800), "검증 우선");
});

test("AI 1순위가 최저가면 가성비는 그다음 후보로 민다", () => {
  const aligned = alignLabelsWithPrice([
    candidate("best", 10000),
    candidate("value", 50000),
    candidate("reliable", 20000),
    candidate("premium", 90000),
  ]);

  assert.equal(labelAt(aligned, 10000), "가장 추천");
  assert.equal(labelAt(aligned, 20000), "가성비 선택");
  assert.equal(labelAt(aligned, 90000), "한 단계 위");
  assert.equal(labelAt(aligned, 50000), "검증 우선");
});

test("AI 1순위가 최고가면 한 단계 위는 그다음 후보로 민다", () => {
  const aligned = alignLabelsWithPrice([
    candidate("best", 90000),
    candidate("value", 50000),
    candidate("reliable", 20000),
    candidate("premium", 10000),
  ]);

  assert.equal(labelAt(aligned, 90000), "가장 추천");
  assert.equal(labelAt(aligned, 10000), "가성비 선택");
  assert.equal(labelAt(aligned, 50000), "한 단계 위");
  assert.equal(labelAt(aligned, 20000), "검증 우선");
});

test("네 자리에 라벨이 하나씩만 배정된다", () => {
  const aligned = alignLabelsWithPrice([
    candidate("best", 30000),
    candidate("value", 30000),
    candidate("reliable", 30000),
    candidate("premium", 30000),
  ]);
  const labels = aligned.map((item) => item.selectionLabel).sort();
  assert.deepEqual(labels, ["가성비 선택", "가장 추천", "검증 우선", "한 단계 위"]);
});

test("이미 맞게 배정돼 있으면 그대로 둔다", () => {
  const items = [
    candidate("best", 44800),
    candidate("value", 21900),
    candidate("reliable", 52800),
    candidate("premium", 69900),
  ];
  assert.deepEqual(alignLabelsWithPrice(items), items);
});

test("가격이 낮을수록 가격 부담 점수가 높아야 한다", () => {
  // 69,900원이 100점, 21,900원이 70점으로 나갔다.
  const aligned = alignLabelsWithPrice([
    candidate("best", 44800, 85),
    candidate("value", 69900, 100),
    candidate("reliable", 52800, 90),
    candidate("premium", 21900, 70),
  ]);

  const prices = [21900, 44800, 52800, 69900];
  const scores = prices.map((price) => priceScoreAt(aligned, price));
  assert.deepEqual(scores, [100, 90, 85, 70]);
  // AI 가 벌려 놓은 값 자체는 그대로 쓰고 순서만 바꾼다.
  assert.deepEqual([...scores].sort((a, b) => a! - b!), [70, 85, 90, 100]);
});

test("가격 점수가 이미 맞으면 건드리지 않는다", () => {
  const items = [
    candidate("best", 44800, 85),
    candidate("value", 21900, 100),
    candidate("reliable", 52800, 80),
    candidate("premium", 69900, 70),
  ];
  const aligned = alignLabelsWithPrice(items);
  assert.deepEqual(
    [21900, 44800, 52800, 69900].map((price) => priceScoreAt(aligned, price)),
    [100, 85, 80, 70]
  );
});

test("가격 축이 아닌 점수는 건드리지 않는다", () => {
  const aligned = alignLabelsWithPrice([
    candidate("best", 44800, 85),
    candidate("value", 69900, 100),
    candidate("reliable", 52800, 90),
    candidate("premium", 21900, 70),
  ]);
  for (const item of aligned) {
    assert.equal(
      item.scores?.find((score) => score.label === "받는 사람 만족")?.value,
      90
    );
  }
});

test("가격을 못 찾은 후보는 최저가로 보지 않는다", () => {
  // 검색이 실패해 가격이 없는 것을 가장 싸다고 할 수는 없다.
  const aligned = alignLabelsWithPrice([
    candidate("best", 44800),
    candidate("value", 69900),
    candidate("reliable", undefined),
    candidate("premium", 21900),
  ]);
  assert.equal(labelAt(aligned, 21900), "가성비 선택");
  assert.equal(
    aligned.find((item) => item.price === undefined)?.selectionLabel,
    "검증 우선"
  );
});

test("비교할 가격이 하나뿐이면 그대로 둔다", () => {
  const items = [
    candidate("best", 44800),
    candidate("value", undefined),
    candidate("reliable", undefined),
  ];
  assert.deepEqual(alignLabelsWithPrice(items), items);
});

test("상품을 못 붙인 후보는 빼고 카드 수를 줄인다", () => {
  // 검색어가 비슷해 넷 중 셋이 같은 상품에 걸리면, 이미 쓴 상품을 빼고
  // 남는 것이 없는 후보가 생긴다. 값도 사진도 없는 카드를 옆에 세우느니 뺀다.
  const kept = dropUnmatchedWhenOthersMatched([
    candidate("best", 260000),
    candidate("value", 198000),
    candidate("reliable", 240000),
    candidate("premium", undefined),
  ]);
  assert.equal(kept.length, 3);
  assert.ok(kept.every((item) => typeof item.price === "number"));
});

test("셋을 못 채우면 빼지 않는다", () => {
  // 둘만 남으면 "다른 관점의 선택들"이라는 말이 무색해진다.
  const items = [
    candidate("best", 260000),
    candidate("value", 198000),
    candidate("reliable", undefined),
    candidate("premium", undefined),
  ];
  assert.deepEqual(dropUnmatchedWhenOthersMatched(items), items);
});

test("쿠팡 조회가 통째로 실패하면 그대로 둔다", () => {
  // 모두 같은 처지라 덜어낼 것이 없다. 검색 링크라도 있는 편이 낫다.
  const items = [
    candidate("best", undefined),
    candidate("value", undefined),
    candidate("reliable", undefined),
    candidate("premium", undefined),
  ];
  assert.deepEqual(dropUnmatchedWhenOthersMatched(items), items);
});
