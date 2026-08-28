import { strict as assert } from "node:assert";
import test from "node:test";

import { applyPriorityWeighting } from "../src/lib/recommendation/overall-score.ts";
import { applyPriceBurdenScores, priceBurdenScore } from "../src/lib/recommendation/scores.ts";
import {
  assignSelectionLabels,
  dropUnmatchedWhenOthersMatched,
} from "../src/lib/recommendation/selection-labels.ts";
import { verifyRecommendations } from "../src/lib/recommendation/verify-result.ts";
import type { QuickRecommendation } from "../src/lib/types/analyze.ts";
import type { CategoryId } from "../src/lib/types/category.ts";

const GIFT_LABELS = {
  best: "가장 추천",
  value: "가성비 선택",
  reliable: "검증 우선",
  premium: "한 단계 위",
} as const;

type Type = keyof typeof GIFT_LABELS;

function gift(
  name: string,
  type: Type,
  price: number,
  satisfaction: number,
  safety: number
): QuickRecommendation {
  return {
    rank: 1,
    name,
    reason: "",
    searchKeyword: "",
    qualitySummary: "",
    productName: name,
    selectionType: type,
    selectionLabel: GIFT_LABELS[type],
    price,
    scores: [
      { label: "받는 사람 만족", value: satisfaction },
      { label: "가격 부담", value: 50 },
      { label: "실패 위험 낮음", value: safety },
    ],
  };
}

/** 실제 파이프라인과 같은 순서로 돌린다. */
function run(
  items: QuickRecommendation[],
  categoryId: CategoryId,
  priorityId: string,
  maxBudget: number
) {
  const order = ["best", "value", "reliable", "premium"];
  return assignSelectionLabels(
    applyPriorityWeighting(
      applyPriceBurdenScores(items, maxBudget),
      categoryId,
      priorityId
    )
  )
    .sort(
      (a, b) =>
        order.indexOf(a.selectionType || "best") -
        order.indexOf(b.selectionType || "best")
    )
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function labelOf(items: QuickRecommendation[], name: string) {
  return items.find((item) => item.name === name)?.selectionLabel;
}

test("가격 부담은 가격만으로 정해지고 쌀수록 높다", () => {
  assert.equal(priceBurdenScore(100000, 100000), 60);
  assert.equal(priceBurdenScore(50000, 100000), 80);
  assert.equal(priceBurdenScore(25000, 100000), 90);
  // 예산을 넘으면 더 내려간다.
  assert.ok(priceBurdenScore(150000, 100000) < 60);
  // 단조성: 가격이 오르면 점수는 절대 오르지 않는다.
  let previous = 101;
  for (let price = 0; price <= 200000; price += 5000) {
    const score = priceBurdenScore(price, 100000);
    assert.ok(score <= previous);
    previous = score;
  }
});

test("케이스 A — 선물 / 부모님 감사 / 편리함 / 10만원 이하", () => {
  /*
    실제로 나갔던 화면이다. 35,600원짜리에 "한 단계 위"가 붙고
    79,700원짜리에 "검증 우선"이 붙었으며, 79,700원의 가격 부담이
    35,600원보다 높았다.
  */
  const ranked = run(
    [
      gift("자동 회전 안마 쿠션", "best", 49000, 95, 90),
      gift("전동 글라인더 차세트", "value", 37900, 80, 85),
      gift("프리미엄 과일 선물상자", "reliable", 79700, 85, 95),
      gift("자동 온도 유지 티포트", "premium", 35600, 90, 85),
    ],
    "gift",
    "convenience",
    100000
  );

  // 라벨은 가격이 정한다.
  assert.equal(labelOf(ranked, "자동 온도 유지 티포트"), "가성비 선택");
  assert.equal(labelOf(ranked, "프리미엄 과일 선물상자"), "한 단계 위");

  const violations = verifyRecommendations(ranked, {
    categoryId: "gift",
    priorityId: "convenience",
  });
  assert.deepEqual(violations, []);
});

test("케이스 B — 여행·데이트 / 휴식·여행 / 동선 / 20만원 이하", () => {
  const place = (
    name: string,
    type: Type,
    price: number,
    experience: number,
    travel: number
  ): QuickRecommendation => ({
    rank: 1,
    name,
    reason: "",
    searchKeyword: "",
    qualitySummary: "",
    productName: name,
    selectionType: type,
    selectionLabel: GIFT_LABELS[type],
    price,
    scores: [
      { label: "경험 만족", value: experience },
      { label: "비용 부담", value: 50 },
      { label: "이동 편의", value: travel },
    ],
  });

  const ranked = run(
    [
      place("예산 예당호", "best", 180000, 95, 70),
      place("천안 독립기념관", "value", 100000, 82, 80),
      place("천안 소노벨", "reliable", 150000, 85, 95),
      place("공주 한옥마을", "premium", 190000, 90, 60),
    ],
    "date",
    "convenience",
    200000
  );

  // 동선을 골랐으므로 이동 편의가 앞선 후보가 "가장 추천"이 된다.
  assert.equal(ranked[0].selectionLabel, "가장 추천");
  assert.equal(ranked[0].name, "천안 소노벨");
  // 라벨은 가격이 정한다.
  assert.equal(labelOf(ranked, "천안 독립기념관"), "가성비 선택");
  assert.equal(labelOf(ranked, "공주 한옥마을"), "한 단계 위");

  const violations = verifyRecommendations(ranked, {
    categoryId: "date",
    priorityId: "convenience",
  });
  assert.deepEqual(violations, []);
});

test("규칙을 어긴 결과는 검증에서 잡힌다", () => {
  const broken: QuickRecommendation[] = [
    { ...gift("비싼데 가성비", "value", 79700, 80, 80), overall: 90 },
    { ...gift("싼데 한 단계 위", "premium", 35600, 80, 80), overall: 95 },
  ];
  const rules = verifyRecommendations(broken, {
    categoryId: "gift",
    priorityId: "convenience",
  }).map((item) => item.rule);
  assert.ok(rules.includes("가성비 선택이 한 단계 위보다 비쌈"));

  // 가격 점수가 가격과 뒤집힌 경우도 잡는다.
  const inverted: QuickRecommendation[] = [
    { ...gift("싼데 점수 낮음", "value", 35600, 80, 80), overall: 90 },
    { ...gift("비싼데 점수 높음", "premium", 79700, 80, 80), overall: 80 },
  ];
  inverted[0].scores = [{ label: "가격 부담", value: 70 }];
  inverted[1].scores = [{ label: "가격 부담", value: 90 }];
  assert.ok(
    verifyRecommendations(inverted, {
      categoryId: "gift",
      priorityId: "convenience",
    })
      .map((item) => item.rule)
      .includes("가격이 비싼 후보의 가격 점수가 더 높음")
  );
});

test("한 후보에 소요 시간이 두 값으로 적히면 잡힌다", () => {
  const items: QuickRecommendation[] = [
    {
      ...gift("숙소", "best", 50000, 90, 90),
      reason: "아산에서 차로 35분 거리입니다.",
      fitChecks: [{ ok: true, text: "차로 40분 내 도착 가능", source: "guide" }],
    },
    gift("다른 숙소", "value", 40000, 80, 80),
  ];
  const violations = verifyRecommendations(items, {
    categoryId: "gift",
    priorityId: "convenience",
  });
  assert.ok(
    violations.some((item) => item.rule === "한 후보의 소요 시간이 여러 값으로 적힘")
  );
});

test("같은 상품이 두 자리를 차지하면 잡힌다", () => {
  const items = [
    gift("같은 상품", "best", 50000, 90, 90),
    gift("같은 상품", "value", 40000, 80, 80),
  ];
  const violations = verifyRecommendations(items, {
    categoryId: "gift",
    priorityId: "convenience",
  });
  assert.ok(violations.some((item) => item.rule === "같은 상품이 여러 자리에 있음"));
});

test("가격을 못 찾은 후보는 빼고 카드 수를 줄인다", () => {
  const kept = dropUnmatchedWhenOthersMatched([
    gift("가", "best", 260000, 90, 90),
    gift("나", "value", 198000, 80, 80),
    gift("다", "reliable", 240000, 85, 85),
    { ...gift("라", "premium", 0, 70, 70), price: undefined },
  ]);
  assert.equal(kept.length, 3);
});

test("예산을 모르면 가격 점수를 건드리지 않는다", () => {
  const items = [gift("가", "best", 50000, 90, 90), gift("나", "value", 40000, 80, 80)];
  assert.deepEqual(applyPriceBurdenScores(items, undefined), items);
});
