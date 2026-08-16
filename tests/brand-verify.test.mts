import { strict as assert } from "node:assert";
import test from "node:test";

import {
  checkNameAgainstProduct,
  cleanProductName,
  extractBrands,
  resolveDisplayName,
} from "../src/lib/monetization/brand-verify.ts";

test("실제로 나갔던 오표기를 잡는다", () => {
  // 카드에는 "삼성전자 비스포크 제트 스테이션"이라고 띄우고
  // 무명 스틱청소기로 링크가 나갔던 사례다.
  const check = checkNameAgainstProduct(
    "삼성전자 비스포크 제트 스테이션",
    "최신형 비브로 무선 스틱 청소기 BLDC 흡입력"
  );
  assert.equal(check.ok, false);
  if (!check.ok) assert.equal(check.reason, "brand-not-in-product");
});

test("존재하지 않는 브랜드 조합을 막는다", () => {
  // 샤오미와 로보락은 다른 회사다. 둘을 붙인 제품은 없다.
  const check = checkNameAgainstProduct(
    "샤오미 로보락 자동 먼지비움 청소기",
    "JONR 로봇청소기 T5 PRO GEN 2"
  );
  assert.equal(check.ok, false);
  if (!check.ok) assert.equal(check.reason, "multiple-brands");
});

test("브랜드가 실제 상품과 맞으면 통과시킨다", () => {
  // 브랜드를 무조건 지우면 신뢰가 떨어진다. 맞으면 그대로 쓴다.
  assert.equal(
    checkNameAgainstProduct("삼성전자 비스포크 제트", "삼성전자 비스포크 제트 청소기").ok,
    true
  );
  assert.equal(
    checkNameAgainstProduct("다이슨 무선청소기", "Dyson V15 무선청소기").ok,
    true
  );
});

test("표기가 달라도 같은 브랜드로 본다", () => {
  assert.equal(checkNameAgainstProduct("샤오미 로봇청소기", "Xiaomi 로봇청소기").ok, true);
  assert.equal(checkNameAgainstProduct("르팡 물걸레 청소기", "Lefant M3 max").ok, true);
  assert.equal(checkNameAgainstProduct("LG 코드제로", "엘지 코드제로 A9").ok, true);
});

test("브랜드가 없는 이름은 그대로 통과한다", () => {
  assert.equal(
    checkNameAgainstProduct("자동 먼지비움 로봇청소기", "JONR 로봇청소기 T5 PRO").ok,
    true
  );
});

test("브랜드를 찾아낸다", () => {
  assert.deepEqual(extractBrands("삼성전자 비스포크"), ["삼성"]);
  assert.deepEqual(extractBrands("Dyson V15"), ["다이슨"]);
  assert.deepEqual(extractBrands("브랜드 없는 청소기"), []);
  assert.equal(extractBrands("샤오미 로보락 청소기").length, 2);
});

test("쿠팡 상품명에서 광고 문구와 옵션을 걷어낸다", () => {
  assert.equal(
    cleanProductName("최신형 비브로 무선 스틱 청소기 BLDC"),
    "비브로 무선 스틱 청소기 BLDC"
  );
  assert.equal(
    cleanProductName("Lefant (르팡)M3 max 물걸레 로봇청소기"),
    "Lefant M3 max 물걸레 로봇청소기"
  );
  // 옵션 나열은 첫 항목까지만 남긴다.
  assert.equal(
    cleanProductName("JONR 로봇청소기 T5 PRO, 화이트, 1개"),
    "JONR 로봇청소기 T5 PRO"
  );
});

test("긴 상품명은 단어 중간에서 끊지 않는다", () => {
  const cleaned = cleanProductName(
    "차이슨 AI 자동 충전 먼지 비움 로봇청소기 물걸레 겸용 흡입력 강력",
    34
  );
  assert.ok(cleaned.length <= 34);
  assert.ok(!cleaned.endsWith(" "));
  // 잘린 자리가 단어 경계여야 한다.
  assert.ok(/[가-힣a-zA-Z0-9]$/.test(cleaned));
});

test("검증에 걸리면 실제 상품명을 쓴다", () => {
  assert.equal(
    resolveDisplayName("삼성전자 비스포크 제트 스테이션", "최신형 비브로 무선 스틱 청소기"),
    "비브로 무선 스틱 청소기"
  );
});

test("검증을 통과하면 AI 이름을 그대로 쓴다", () => {
  assert.equal(
    resolveDisplayName("다이슨 무선청소기", "Dyson V15 Detect 무선청소기 정품"),
    "다이슨 무선청소기"
  );
});

test("쿠팡 상품이 없으면 AI 이름을 그대로 둔다", () => {
  // 검색 실패로 상품을 못 붙인 경우다. 비교할 대상이 없으므로 검증하지 않는다.
  assert.equal(resolveDisplayName("자동 먼지비움 로봇청소기", undefined), "자동 먼지비움 로봇청소기");
  assert.equal(resolveDisplayName("자동 먼지비움 로봇청소기", ""), "자동 먼지비움 로봇청소기");
});
