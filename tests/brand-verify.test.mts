import { strict as assert } from "node:assert";
import test from "node:test";

import {
  cleanProductName,
  extractBrands,
  resolveDisplayName,
} from "../src/lib/monetization/brand-verify.ts";

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

test("상품을 찾았으면 그 상품의 이름을 쓴다", () => {
  // 표시되는 이름이 곧 링크되는 상품이 되어야 오표기가 생기지 않는다.
  assert.equal(
    resolveDisplayName("삼성전자 비스포크 제트 스테이션", "최신형 비브로 무선 스틱 청소기"),
    "비브로 무선 스틱 청소기"
  );
  // AI 가 붙인 분류 설명 대신 실제 제품명이 나와야 무엇을 사라는 것인지 안다.
  assert.equal(
    resolveDisplayName("자동 먼지비움 로봇청소기", "톰라야 로봇청소기 스마트 물걸레"),
    "톰라야 로봇청소기 스마트 물걸레"
  );
});

test("상품을 못 찾으면 AI 이름을 쓰되 브랜드는 뺀다", () => {
  // 대조할 상품이 없으면 브랜드가 맞는지 확인할 방법이 없다.
  assert.equal(
    resolveDisplayName("자동 먼지비움 로봇청소기", undefined),
    "자동 먼지비움 로봇청소기"
  );
  assert.equal(
    resolveDisplayName("삼성전자 자동 먼지비움 로봇청소기", ""),
    "자동 먼지비움 로봇청소기"
  );
});

test("브랜드와 겹치는 일반 낱말은 지우지 않는다", () => {
  // 일상어와 겹치는 한글 표기는 브랜드 목록에 없다. 색상·부속품 이름이
  // 브랜드로 오인돼 잘려 나가면 무엇을 사라는 것인지 알 수 없게 된다.
  assert.equal(
    resolveDisplayName("최신 모델 무선청소기", undefined),
    "최신 모델 무선청소기"
  );
  assert.equal(
    resolveDisplayName("브라운 색상 가죽 지갑", undefined),
    "브라운 색상 가죽 지갑"
  );
  assert.equal(
    resolveDisplayName("기내용 캐리어 20인치", undefined),
    "기내용 캐리어 20인치"
  );
});
