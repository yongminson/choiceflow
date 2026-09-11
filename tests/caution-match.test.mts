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
