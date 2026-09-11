import { strict as assert } from "node:assert";
import test from "node:test";

import { orderForDisplay } from "../src/lib/recommendation/display-order.ts";
import { verifyRecommendations } from "../src/lib/recommendation/verify-result.ts";
import type { QuickRecommendation } from "../src/lib/types/analyze.ts";

function place(
  name: string,
  overall: number,
  type: NonNullable<QuickRecommendation["selectionType"]>,
  price?: number
): QuickRecommendation {
  return {
    rank: 0,
    name,
    reason: "",
    searchKeyword: "",
    qualitySummary: "",
    overall,
    price,
    selectionType: type,
  };
}

/* 여행·데이트에서 나온 화면. 90점이 위에 서고 92점이 그래프 1위였다. */
test("맨 위는 종합 적합도 1위가 된다", () => {
  const ordered = orderForDisplay([
    place("당진 아미미술관", 90, "best"),
    place("예산 삽교호 산책", 83, "value"),
    place("아산 신정호 생태체험", 88, "reliable"),
    place("공주 석장리박물관", 92, "premium"),
  ]);

  assert.equal(ordered[0].name, "공주 석장리박물관");
  assert.deepEqual(
    ordered.map((item) => item.overall),
    [92, 90, 88, 83]
  );
});

test("순서대로 rank 를 다시 매긴다", () => {
  const ordered = orderForDisplay([
    place("A", 80, "best"),
    place("B", 95, "value"),
  ]);
  assert.deepEqual(
    ordered.map((item) => item.rank),
    [1, 2]
  );
  assert.equal(ordered[0].name, "B");
});

test("점수가 같으면 자리 순서, 그다음 싼 쪽이 앞", () => {
  const ordered = orderForDisplay([
    place("비싼 검증", 90, "reliable", 50_000),
    place("가장 추천", 90, "best", 90_000),
    place("싼 검증", 90, "reliable", 10_000),
  ]);
  assert.equal(ordered[0].name, "가장 추천");
  assert.equal(ordered[1].name, "싼 검증");
});

test("가격이 없는 후보도 순서가 정해진다", () => {
  const ordered = orderForDisplay([
    place("A", 88, "best"),
    place("B", 88, "value"),
  ]);
  assert.equal(ordered.length, 2);
  assert.equal(ordered[0].name, "A");
});

test("세운 결과는 히어로 규칙에 걸리지 않는다", () => {
  const ordered = orderForDisplay([
    place("당진 아미미술관", 90, "best"),
    place("공주 석장리박물관", 92, "premium"),
    place("아산 신정호", 88, "reliable"),
  ]);

  const rules = verifyRecommendations(ordered, {
    categoryId: "date",
    priorityId: "experience",
  }).map((v) => v.rule);

  assert.equal(rules.includes("맨 위 카드가 종합 적합도 1위가 아님"), false);
});

test("세우지 않은 결과는 히어로 규칙에 걸린다", () => {
  const rules = verifyRecommendations(
    [
      place("당진 아미미술관", 90, "best"),
      place("공주 석장리박물관", 92, "premium"),
    ],
    { categoryId: "date", priorityId: "experience" }
  ).map((v) => v.rule);

  assert.equal(rules.includes("맨 위 카드가 종합 적합도 1위가 아님"), true);
});

/* 분야가 무엇이든 같은 함수를 쓰므로 결과도 같아야 한다. */
test("여섯 분야 어디서든 맨 위가 종합 1위다", () => {
  const categories = [
    "food",
    "gift",
    "appliance",
    "fashion",
    "date",
    "asset",
  ] as const;

  for (const categoryId of categories) {
    const ordered = orderForDisplay([
      place("A", 70, "best"),
      place("B", 99, "premium"),
      place("C", 85, "value"),
    ]);
    const rules = verifyRecommendations(ordered, {
      categoryId,
      priorityId: "price",
    }).map((v) => v.rule);
    assert.equal(
      rules.includes("맨 위 카드가 종합 적합도 1위가 아님"),
      false,
      `${categoryId} 에서 맨 위가 1위가 아니다`
    );
    assert.equal(ordered[0].name, "B", categoryId);
  }
});
