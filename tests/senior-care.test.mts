import { strict as assert } from "node:assert";
import test from "node:test";

import {
  hasServiceableBrand,
  isServiceableBrand,
  needsSeniorCare,
  seniorFriendlyKeyword,
} from "../src/lib/recommendation/senior-care.ts";
import { overallWeights } from "../src/lib/recommendation/overall-score.ts";
import type { QuickRecommendation } from "../src/lib/types/analyze.ts";

const WISH = "70대 부모님이 유튜브랑 손주 영상통화만 하실 태블릿, 제가 대신 골라드리려고요";

test("나이 든 분이 쓸 물건인지 읽는다", () => {
  assert.equal(needsSeniorCare(WISH), true);
  assert.equal(needsSeniorCare("어머니 드릴 선물"), true);
  assert.equal(needsSeniorCare("어르신 쓰실 전화기"), true);
  assert.equal(needsSeniorCare("85세 할머니 의자"), true);
});

test("나이와 상관없는 요청은 해당하지 않는다", () => {
  assert.equal(needsSeniorCare("제가 쓸 게이밍 노트북"), false);
  assert.equal(needsSeniorCare("예비 부모 준비물"), false);
  assert.equal(needsSeniorCare(""), false);
});

test("서비스센터를 찾아갈 수 있는 제조사를 가려낸다", () => {
  assert.equal(isServiceableBrand("삼성전자 갤럭시탭 A9"), true);
  assert.equal(isServiceableBrand("LG 그램 탭"), true);
  assert.equal(isServiceableBrand("DOOGEE U11PRO 안드로이드 태블릿"), false);
  assert.equal(isServiceableBrand("Wqplo A10L 태블릿 PC"), false);
});

/* 사용자가 본 화면. 넷 다 이름 모를 브랜드였다. */
test("후보에 아는 제조사가 하나도 없으면 알아챈다", () => {
  const items = [
    { productName: "DOOGEE U11PRO 안드로이드 16 태블릿 11인치" },
    { productName: "Wqplo A10L 태블릿 PC" },
    { productName: "TABWEE 10.1인치 대화면 태블릿 PC" },
    { productName: "Wqplo MB1001 태블릿PC" },
  ];
  assert.equal(hasServiceableBrand(items), false);
  assert.equal(
    hasServiceableBrand([...items, { productName: "삼성 갤럭시탭 A9+" }]),
    true
  );
});

test("검색어에 특정 회사 이름을 넣지는 않는다", () => {
  const keyword = seniorFriendlyKeyword("대화면 태블릿");
  assert.equal(keyword.includes("삼성"), false);
  assert.equal(keyword.includes("LG"), false);
  assert.ok(keyword.includes("대화면 태블릿"));
});

test("이미 브랜드를 가리키는 검색어는 그대로 둔다", () => {
  assert.equal(
    seniorFriendlyKeyword("국내 브랜드 태블릿"),
    "국내 브랜드 태블릿"
  );
});

/* 가중치 — 고른 조건은 그대로 두고 남는 몫 안에서만 A/S 를 키운다. */
function item(scores: Record<string, number>): QuickRecommendation {
  return {
    rank: 1,
    name: "x",
    reason: "",
    searchKeyword: "",
    qualitySummary: "",
    scores: Object.entries(scores).map(([label, value]) => ({ label, value })),
  };
}

const AXES = {
  성능: 80,
  "가격 부담": 70,
  "관리 편의": 60,
  "A/S 안심도": 50,
};

test("나이 든 분 요청이면 A/S 안심도 무게가 커진다", () => {
  const items = [item(AXES), item(AXES)];
  const plain = overallWeights(items, "appliance", "convenience");
  const senior = overallWeights(items, "appliance", "convenience", true);

  assert.ok(plain && senior);
  assert.ok(
    (senior.get("A/S 안심도") ?? 0) > (plain.get("A/S 안심도") ?? 0),
    "A/S 무게가 커지지 않았다"
  );
});

test("고른 조건의 무게는 건드리지 않는다", () => {
  const items = [item(AXES), item(AXES)];
  const plain = overallWeights(items, "appliance", "convenience");
  const senior = overallWeights(items, "appliance", "convenience", true);

  // 편리함을 골랐으므로 "관리 편의"가 고른 축이다.
  assert.equal(senior?.get("관리 편의"), plain?.get("관리 편의"));
});

test("무게를 다 더하면 1 이 된다", () => {
  const items = [item(AXES), item(AXES)];
  const senior = overallWeights(items, "appliance", "convenience", true);
  const total = [...(senior?.values() ?? [])].reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `합이 ${total} 이다`);
});

test("A/S 축이 고른 조건이면 따로 키우지 않는다", () => {
  const items = [item(AXES), item(AXES)];
  const senior = overallWeights(items, "appliance", "price", true);
  const total = [...(senior?.values() ?? [])].reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});
