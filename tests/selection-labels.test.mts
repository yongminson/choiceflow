import { strict as assert } from "node:assert";
import test from "node:test";

import { assignSelectionLabels } from "../src/lib/recommendation/selection-labels.ts";
import { verifyRecommendations } from "../src/lib/recommendation/verify-result.ts";
import type { QuickRecommendation } from "../src/lib/types/analyze.ts";

/** 가전 카테고리 문구. route.ts 의 selectionLabel 과 같은 값이다. */
const APPLIANCE_LABELS = {
  best: "가장 추천",
  value: "가성비 선택",
  reliable: "검증 우선",
  premium: "한 단계 위",
} as const;

type Type = keyof typeof APPLIANCE_LABELS;

const labelFor = (type: Type) => APPLIANCE_LABELS[type];

function item(
  name: string,
  price: number,
  overall: number,
  type: Type = "best"
): QuickRecommendation {
  return {
    rank: 1,
    name,
    reason: "",
    searchKeyword: "",
    qualitySummary: "",
    productName: name,
    price,
    overall,
    selectionType: type,
    selectionLabel: APPLIANCE_LABELS[type],
  };
}

function typeOf(items: QuickRecommendation[], name: string) {
  return items.find((entry) => entry.name === name)?.selectionType;
}

function cheapest(items: QuickRecommendation[]) {
  return [...items].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
}

/*
  실제로 나갔던 화면이다. 후보가 셋으로 줄면서 "가성비 선택"이 최고가에,
  "가장 추천"이 최저가에 붙었다. 값은 사용자가 보낸 재현 조건 그대로다.
*/
test("후보가 셋이어도 가성비 선택은 최저가에 붙는다", () => {
  const items = [
    item("A", 158_270, 88, "best"),
    item("B", 189_980, 71, "value"),
    item("C", 169_980, 80, "reliable"),
  ];

  const result = assignSelectionLabels(items, labelFor);

  assert.equal(typeOf(result, "A"), "value");
  assert.equal(
    result.find((entry) => entry.selectionType === "value")?.price,
    158_270
  );
});

test("후보가 셋이면 한 단계 위는 쓰지 않는다", () => {
  const items = [
    item("A", 158_270, 88),
    item("B", 189_980, 71),
    item("C", 169_980, 80),
  ];

  const types = assignSelectionLabels(items, labelFor).map(
    (entry) => entry.selectionType
  );

  assert.equal(types.includes("premium"), false);
  assert.deepEqual([...types].sort(), ["best", "reliable", "value"]);
});

test("후보가 둘이면 가장 추천과 가성비 선택만 쓴다", () => {
  const items = [item("A", 120_000, 70), item("B", 150_000, 90)];

  const result = assignSelectionLabels(items, labelFor);
  const types = result.map((entry) => entry.selectionType);

  assert.deepEqual([...types].sort(), ["best", "value"]);
  assert.equal(typeOf(result, "A"), "value");
  assert.equal(typeOf(result, "B"), "best");
});

test("후보가 넷이면 한 단계 위가 최고가에 붙는다", () => {
  const items = [
    item("A", 100_000, 70),
    item("B", 200_000, 90),
    item("C", 150_000, 85),
    item("D", 180_000, 60),
  ];

  const result = assignSelectionLabels(items, labelFor);

  assert.equal(typeOf(result, "A"), "value");
  assert.equal(typeOf(result, "B"), "premium");
  assert.deepEqual(
    [...result.map((entry) => entry.selectionType)].sort(),
    ["best", "premium", "reliable", "value"]
  );
});

test("가장 추천은 남은 후보 중 종합 적합도 1위다", () => {
  const items = [
    item("A", 100_000, 70),
    item("B", 200_000, 99),
    item("C", 150_000, 85),
    item("D", 180_000, 60),
  ];

  // B 는 최고가라 한 단계 위로 빠진다. 남은 것 중 1위는 C 다.
  assert.equal(typeOf(assignSelectionLabels(items, labelFor), "C"), "best");
});

test("라벨 문구가 배정된 자리와 함께 바뀐다", () => {
  const items = [
    item("A", 158_270, 88, "best"),
    item("B", 189_980, 71, "value"),
    item("C", 169_980, 80, "reliable"),
  ];

  const result = assignSelectionLabels(items, labelFor);

  for (const entry of result) {
    assert.equal(
      entry.selectionLabel,
      APPLIANCE_LABELS[entry.selectionType as Type]
    );
  }
});

test("가격을 모르는 후보는 최저가로 보지 않는다", () => {
  const known = item("A", 150_000, 80);
  const unknown: QuickRecommendation = {
    ...item("B", 0, 90),
    price: undefined,
  };
  const third = item("C", 120_000, 70);

  const result = assignSelectionLabels([known, unknown, third], labelFor);

  assert.equal(typeOf(result, "C"), "value");
  assert.notEqual(typeOf(result, "B"), "value");
});

/*
  개수가 몇이든 이것 하나는 반드시 지켜져야 한다.
  화면에서 "가성비 선택" 옆에 "후보 중 가장 비쌈"이 붙는 일을 막는 규칙이다.
*/
test("후보 수가 둘에서 여섯까지 어떻든 가성비 선택은 최저가다", () => {
  const pool = [
    item("A", 158_270, 88),
    item("B", 189_980, 71),
    item("C", 169_980, 80),
    item("D", 143_000, 64),
    item("E", 210_500, 95),
    item("F", 175_400, 77),
  ];

  for (let count = 2; count <= pool.length; count += 1) {
    const items = pool.slice(0, count);
    const result = assignSelectionLabels(items, labelFor);
    const value = result.find((entry) => entry.selectionType === "value");
    assert.equal(
      value?.price,
      cheapest(items).price,
      `후보 ${count}개에서 가성비 선택이 최저가가 아니다`
    );
  }
});

/*
  검증 함수 쪽 규칙. 배정이 올바르면 걸릴 일이 없어야 하고,
  일부러 어긋난 값을 넣으면 반드시 걸려야 한다.
*/
const CONTEXT = {
  categoryId: "appliance" as const,
  priorityId: "price",
  maxBudgetWon: 500_000,
};

test("사용자가 본 화면을 그대로 넣으면 규칙에 걸린다", () => {
  const broken: QuickRecommendation[] = [
    { ...item("A", 158_270, 88, "best") },
    {
      ...item("B", 189_980, 71, "value"),
      fitChecks: [
        { ok: false, text: "후보 중 가장 비쌈", source: "verified" as const },
      ],
    },
    { ...item("C", 169_980, 80, "reliable") },
  ];

  const rules = verifyRecommendations(broken, CONTEXT).map((v) => v.rule);

  assert.equal(rules.includes("가성비 선택이 최저가가 아님"), true);
  assert.equal(
    rules.includes("가성비 선택에 가장 비쌈 표시가 함께 붙음"),
    true
  );
});

test("배정을 거친 결과는 라벨 규칙에 걸리지 않는다", () => {
  const fixed = assignSelectionLabels(
    [
      item("A", 158_270, 88, "best"),
      item("B", 189_980, 71, "value"),
      item("C", 169_980, 80, "reliable"),
    ],
    labelFor
  );

  const rules = verifyRecommendations(fixed, CONTEXT).map((v) => v.rule);

  assert.equal(rules.includes("가성비 선택이 최저가가 아님"), false);
  assert.equal(rules.includes("후보가 넷 미만인데 한 단계 위가 쓰임"), false);
  assert.equal(rules.includes("같은 관점 라벨이 여러 후보에 붙음"), false);
});

test("후보 셋에 한 단계 위가 섞이면 걸린다", () => {
  const broken = [
    item("A", 158_270, 88, "value"),
    item("B", 189_980, 71, "premium"),
    item("C", 169_980, 80, "best"),
  ];

  const rules = verifyRecommendations(broken, CONTEXT).map((v) => v.rule);
  assert.equal(rules.includes("후보가 넷 미만인데 한 단계 위가 쓰임"), true);
});

test("같은 라벨이 두 번 나오면 걸린다", () => {
  const broken = [
    item("A", 158_270, 88, "value"),
    item("B", 189_980, 71, "best"),
    item("C", 169_980, 80, "best"),
  ];

  const rules = verifyRecommendations(broken, CONTEXT).map((v) => v.rule);
  assert.equal(rules.includes("같은 관점 라벨이 여러 후보에 붙음"), true);
});

/*
  히어로(맨 위 카드)와 종합 적합도 1위가 어긋나는 것을 막는 규칙.
  82점짜리가 "AI 추천 1위"로 서고 94점짜리가 그래프 1위로 나간 적이 있다.
*/
test("맨 위가 종합 1위가 아니면 걸린다", () => {
  const broken = [
    item("전기요", 27_990, 82, "best"),
    item("온수매트", 157_000, 94, "premium"),
    item("기타", 90_000, 88, "value"),
  ];

  const rules = verifyRecommendations(broken, CONTEXT).map((v) => v.rule);
  assert.equal(rules.includes("맨 위 카드가 종합 적합도 1위가 아님"), true);
});

test("종합 적합도 순으로 세우면 걸리지 않는다", () => {
  const sorted = [
    item("온수매트", 157_000, 94, "premium"),
    item("기타", 90_000, 88, "value"),
    item("전기요", 27_990, 82, "best"),
  ];

  const rules = verifyRecommendations(sorted, CONTEXT).map((v) => v.rule);
  assert.equal(rules.includes("맨 위 카드가 종합 적합도 1위가 아님"), false);
});
