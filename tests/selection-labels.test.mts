import { strict as assert } from "node:assert";
import test from "node:test";

import { alignValueLabelWithPrice } from "../src/lib/recommendation/selection-labels.ts";
import type { QuickRecommendation } from "../src/lib/types/analyze.ts";

function candidate(
  selectionType: "best" | "value" | "reliable" | "premium",
  selectionLabel: string,
  price?: number
): QuickRecommendation {
  return {
    rank: 1,
    name: `${selectionLabel} 후보`,
    reason: "",
    searchKeyword: "",
    qualitySummary: "",
    selectionType,
    selectionLabel,
    price,
  };
}

function labelOf(items: QuickRecommendation[], name: string): string | undefined {
  return items.find((item) => item.name === name)?.selectionLabel;
}

test("가성비 라벨이 최저가가 아니면 최저가 후보와 맞바꾼다", () => {
  // 실제로 나갔던 화면이다. "가성비 선택"이 241,400원인데
  // 그 아래 후보가 190,000원이었다. 값을 보고 고르라면서 틀린 말을 한 셈이다.
  const aligned = alignValueLabelWithPrice([
    candidate("best", "최종 선택", 260000),
    candidate("value", "가성비 선택", 241400),
    candidate("reliable", "A/S·신뢰성 선택", 190000),
    candidate("premium", "성능 우선 선택", 300000),
  ]);

  assert.equal(labelOf(aligned, "A/S·신뢰성 선택 후보"), "가성비 선택");
  assert.equal(labelOf(aligned, "가성비 선택 후보"), "A/S·신뢰성 선택");

  // 순서를 정하는 selectionType 도 함께 옮겨야 라벨과 자리가 어긋나지 않는다.
  const cheapest = aligned.find((item) => item.price === 190000);
  assert.equal(cheapest?.selectionType, "value");
});

test("가성비 라벨이 이미 최저가면 그대로 둔다", () => {
  const items = [
    candidate("best", "최종 선택", 260000),
    candidate("value", "가성비 선택", 150000),
    candidate("reliable", "A/S·신뢰성 선택", 190000),
  ];
  assert.deepEqual(alignValueLabelWithPrice(items), items);
});

test("근소한 차이로는 라벨을 뒤집지 않는다", () => {
  // 3% 차이로 라벨이 오가면 같은 조건에서 화면이 계속 달라 보인다.
  const items = [
    candidate("value", "가성비 선택", 200000),
    candidate("reliable", "A/S·신뢰성 선택", 195000),
  ];
  assert.deepEqual(alignValueLabelWithPrice(items), items);
});

test("가격을 못 찾은 후보는 비교에서 뺀다", () => {
  // 검색이 실패해 가격이 없는 후보를 최저가로 볼 수는 없다.
  const items = [
    candidate("value", "가성비 선택", 200000),
    candidate("reliable", "A/S·신뢰성 선택", undefined),
  ];
  assert.deepEqual(alignValueLabelWithPrice(items), items);
});
