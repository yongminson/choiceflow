import { strict as assert } from "node:assert";
import test from "node:test";

import {
  isWrongCaution,
  replaceWrongCautions,
} from "../src/lib/recommendation/caution-match.ts";
import {
  detectTargetItem,
  matchesTargetItem,
} from "../src/lib/recommendation/item-match.ts";

/* 실제로 나갔던 화면. 전기요에 온수매트 단점이 붙었다. */
test("전기요에 물 빠짐 단점이 붙으면 어긋난 것으로 본다", () => {
  assert.equal(
    isWrongCaution(
      "동절기 보관 시 물 빠짐 과정이 번거로울 수 있습니다",
      "무자계 카본 전기요 싱글"
    ),
    true
  );
});

test("온수매트에 붙은 물 빠짐 단점은 그대로 둔다", () => {
  assert.equal(
    isWrongCaution(
      "동절기 보관 시 물 빠짐 과정이 번거로울 수 있습니다",
      "일월 듀얼하트 온수매트"
    ),
    false
  );
});

test("상품명을 모르면 판단하지 않는다", () => {
  assert.equal(isWrongCaution("물 빠짐이 번거롭습니다", undefined), false);
});

test("필터·배터리·소음도 제품 방식이 맞아야 한다", () => {
  assert.equal(isWrongCaution("필터 교체 비용이 듭니다", "전기요 싱글"), true);
  assert.equal(
    isWrongCaution("필터 교체 비용이 듭니다", "공기청정기 33평"),
    false
  );
  assert.equal(
    isWrongCaution("배터리 수명이 짧습니다", "유선 전기장판"),
    true
  );
  assert.equal(
    isWrongCaution("배터리 수명이 짧습니다", "무선 청소기"),
    false
  );
});

test("어긋난 단점은 일반 문구로 바뀌고 자리는 비지 않는다", () => {
  const items = [
    {
      name: "전기요",
      productName: "무자계 카본 전기요",
      caution: "동절기 보관 시 물 빠짐 과정이 번거로울 수 있습니다",
    },
    {
      name: "온수매트",
      productName: "일월 온수매트",
      caution: "동절기 보관 시 물 빠짐 과정이 번거로울 수 있습니다",
    },
  ];
  const warn = console.warn;
  console.warn = () => {};
  replaceWrongCautions(items, "판매처에서 확인해 주세요.");
  console.warn = warn;

  assert.equal(items[0].caution, "판매처에서 확인해 주세요.");
  assert.notEqual(items[1].caution, "판매처에서 확인해 주세요.");
  assert.ok(items[0].caution.length > 0);
});

/* 품목 분리 — 전기요와 온수매트는 다른 물건이다. */
test("전기요를 찾으면 온수매트는 후보가 아니다", () => {
  const target = detectTargetItem("침대에서 아이와 쓸 전기요");
  assert.equal(target?.name, "전기요");
  assert.equal(matchesTargetItem("일월 듀얼하트 온수매트", target), false);
  assert.equal(matchesTargetItem("무자계 카본 전기요 싱글", target), true);
});

test("이름에 두 품목이 섞인 상품은 뺀다", () => {
  const target = detectTargetItem("침대에서 아이와 쓸 전기요");
  // 실제로 올라왔던 상품. 소파에 까는 방석인데 이름에 전기요가 들어 있다.
  assert.equal(
    matchesTargetItem("전기방석 카본 온열 소파 전기요", target),
    false
  );
});

test("품목을 안 적었으면 아무것도 거르지 않는다", () => {
  assert.equal(detectTargetItem("따뜻한 거 아무거나"), undefined);
  assert.equal(matchesTargetItem("아무 상품", undefined), true);
});

/*
  값·브랜드를 걸고 한 말이 상품과 정반대였던 화면.
  22만원짜리 최저가에 "예산 상한선에 가깝다"가, 삼성 제품에
  "대기업 제품에 비해 아쉽다"가 붙어 나갔다.
*/
const CHEAP_TV = "43인치 FHD LED대기업 IPS패널 중소기업TV";
const SAMSUNG_TV = "삼성직접배송 삼성TV UHD 4K LED TV 에너지효율";
const BUDGET = 1_500_000;

test("최저가 후보에 예산 상한선 이야기가 붙으면 어긋난 것으로 본다", () => {
  assert.equal(
    isWrongCaution(
      "안정성과 A/S를 우선하면 동급 사양 대비 가격이 예산 상한선에 가까워질 수 있습니다",
      CHEAP_TV,
      { price: 222_000, maxBudgetWon: BUDGET }
    ),
    true
  );
});

test("예산에 실제로 가까우면 그대로 둔다", () => {
  assert.equal(
    isWrongCaution("가격이 예산 상한선에 가까워집니다", "삼성 TV", {
      price: 1_400_000,
      maxBudgetWon: BUDGET,
    }),
    false
  );
});

test("대기업 상품에 대기업과 비교하는 말이 붙으면 어긋난 것으로 본다", () => {
  assert.equal(
    isWrongCaution(
      "가격대가 낮으면서 대기업 제품에 비해 스피커 음질이나 패널 밝기가 다소 아쉬울 수 있습니다",
      SAMSUNG_TV,
      { price: 709_000, maxBudgetWon: BUDGET }
    ),
    true
  );
});

test("중소기업 상품에 붙은 같은 말은 그대로 둔다", () => {
  assert.equal(
    isWrongCaution(
      "대기업 제품에 비해 스피커 음질이 다소 아쉬울 수 있습니다",
      CHEAP_TV,
      { price: 222_000, maxBudgetWon: BUDGET }
    ),
    false
  );
});

test("예산 절반을 넘는 값에 가격대가 낮다고 적으면 어긋난 것으로 본다", () => {
  assert.equal(
    isWrongCaution("가격대가 낮은 만큼 마감이 아쉽습니다", "중소기업 TV", {
      price: 900_000,
      maxBudgetWon: BUDGET,
    }),
    true
  );
});

test("예산을 모르면 값으로 판단하지 않는다", () => {
  assert.equal(
    isWrongCaution("가격이 예산 상한선에 가깝습니다", CHEAP_TV, {
      price: 222_000,
    }),
    false
  );
});

test("두 문구 모두 일반 문구로 바뀌고 자리는 남는다", () => {
  const items = [
    {
      name: "중소기업 TV",
      productName: CHEAP_TV,
      price: 222_000,
      caution: "가격이 예산 상한선에 가까워질 수 있습니다",
    },
    {
      name: "삼성 TV",
      productName: SAMSUNG_TV,
      price: 709_000,
      caution: "대기업 제품에 비해 음질이 아쉬울 수 있습니다",
    },
  ];
  const warn = console.warn;
  console.warn = () => {};
  replaceWrongCautions(items, "판매처에서 확인해 주세요.", BUDGET);
  console.warn = warn;

  for (const item of items) {
    assert.equal(item.caution, "판매처에서 확인해 주세요.");
  }
});
