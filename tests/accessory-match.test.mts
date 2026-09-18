import { strict as assert } from "node:assert";
import test from "node:test";

import {
  countModelCodes,
  dropAccessories,
  isCheapOutlier,
  looksLikeAccessory,
} from "../src/lib/recommendation/accessory-match.ts";

/* 실제로 후보에 올라왔던 부속품. */
const PAD = "Deebot Ozmo T9 T8 T5 N5 N8 DJ65 DX5 호환 물걸레 패드";
const PAD_NO_WORD = "Deebot Ozmo T9 T8 T5 N5 N8 DJ65";
const BODY = "에브리봇 AI 클린케어 올인원 로봇청소기";
const BODY2 = "샤오미 로보락 S8 MaxV Ultra 로봇청소기";

test("호환 모델이 줄줄이 적힌 상품명은 부속품으로 본다", () => {
  assert.ok(countModelCodes(PAD_NO_WORD) >= 3);
  assert.equal(looksLikeAccessory(PAD_NO_WORD), true);
});

test("부속 낱말이 있으면 부속품으로 본다", () => {
  assert.equal(looksLikeAccessory(PAD), true);
  assert.equal(looksLikeAccessory("샤오미 로봇청소기 먼지봉투 10매"), true);
  assert.equal(looksLikeAccessory("다이슨 V15 헤파필터 교체용"), true);
});

test("본체는 부속품으로 보지 않는다", () => {
  assert.equal(looksLikeAccessory(BODY), false);
  assert.equal(looksLikeAccessory(BODY2), false);
  assert.equal(looksLikeAccessory("LG 코드제로 A9S 무선청소기"), false);
});

test("기능 설명으로 부속 낱말이 들어간 본체는 남긴다", () => {
  assert.equal(
    looksLikeAccessory("로봇청소기 본체 물걸레 패드 일체형"),
    false
  );
});

test("값이 열 배 넘게 싸면 튀는 값으로 본다", () => {
  assert.equal(isCheapOutlier(11_990, 549_000), true);
  assert.equal(isCheapOutlier(138_000, 549_000), false);
  assert.equal(isCheapOutlier(0, 549_000), false);
});

test("사용자가 본 화면에서 패드가 빠진다", () => {
  const warn = console.warn;
  console.warn = () => {};
  const kept = dropAccessories([
    { name: "에브리봇", productName: BODY, price: 549_000 },
    { name: "Deebot", productName: PAD_NO_WORD, price: 11_990 },
  ]);
  console.warn = warn;

  assert.equal(kept.length, 1);
  assert.equal(kept[0].productName, BODY);
});

test("전부 부속품으로 보이면 아무것도 빼지 않는다", () => {
  const warn = console.warn;
  console.warn = () => {};
  const items = [
    { name: "A", productName: PAD_NO_WORD, price: 11_990 },
    { name: "B", productName: PAD, price: 9_900 },
  ];
  const kept = dropAccessories(items);
  console.warn = warn;

  // 하나도 안 남기느니 그대로 둔다. 빈 화면보다는 낫다.
  assert.equal(kept.length, 2);
});

test("상품이 안 붙은 후보는 건드리지 않는다", () => {
  const kept = dropAccessories([
    { name: "A", productName: BODY, price: 549_000 },
    { name: "B" },
  ]);
  assert.equal(kept.length, 2);
});

/*
  식기세척기를 찾는 요청에 세제 셋과 바구니가 후보로 올라왔다.
  상품명에 품목 이름이 그대로 들어 있어 품목 필터도 통과했다.
*/
test("품목 이름이 붙은 소모품을 걸러 낸다", () => {
  for (const name of [
    "베리크린 올인원 가정용 식기세척기세제",
    "공간케어 대용량 업소용 프리미엄 식기세척기 세제",
    "올인원 식기세척기 타블렛 세제 식세기세제 3 in 1",
    "식기세척기 바구니 수저통",
    "로봇청소기 전용 물걸레 패드 10매 리필",
    "밥솥 고무패킹 실리콘 링 호환 부품",
    "전기압력밥솥 세척솔 청소솔",
  ]) {
    assert.equal(looksLikeAccessory(name), true, name);
  }
});

test("본체는 소모품으로 보지 않는다", () => {
  for (const name of [
    "nuvia 누비아 식기세척기 NDW-NI6W 6인용 무설치",
    "쿠쿠 3인용 카운터탑 식기세척기 CDW-A0310FW",
    "SK매직 터치 3인용 식기세척기 무설치",
    "쿠쿠 전기압력밥솥 10인용 CRP-QS1010FW",
    "에브리봇 AI 클린케어 올인원 로봇청소기",
  ]) {
    assert.equal(looksLikeAccessory(name), false, name);
  }
});

test("값이 열 배 넘게 싸면 이름을 몰라도 뺀다", () => {
  const warn = console.warn;
  console.warn = () => {};
  const kept = dropAccessories([
    { name: "본체", productName: "쿠쿠 3인용 카운터탑 식기세척기", price: 329_000 },
    { name: "본체2", productName: "SK매직 3인용 식기세척기 무설치", price: 398_000 },
    { name: "수상", productName: "식기세척기 전용 소분 용기", price: 9_900 },
  ]);
  console.warn = warn;
  assert.equal(kept.length, 2);
  assert.equal(
    kept.some((item) => item.price === 9_900),
    false
  );
});
