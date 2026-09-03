import { strict as assert } from "node:assert";
import test from "node:test";

import {
  detectOccasion,
  isWrongOccasion,
  seasonOfMonth,
} from "../src/lib/recommendation/occasion.ts";

const AUTUMN = new Date("2026-09-28T00:00:00+09:00");

test("실제로 나갔던 화면을 잡는다 — 추석 모임에 여름 상품", () => {
  const wish =
    "작년 명절에 입은 옷이 너무 캐주얼해 보여서 안 입어요, 40대 여성이 시댁 모임에 입을 단정한 옷";
  const occasion = detectOccasion(wish, AUTUMN);
  assert.equal(occasion.season, "autumn");
  assert.equal(occasion.formal, true);

  // 후보에 실제로 올라왔던 상품이다.
  assert.ok(isWrongOccasion("퀸앤조이 미녀77 여름여행 플라워 투피스", occasion));
  // 계절에 맞는 상품은 통과해야 한다.
  assert.ok(!isWrongOccasion("아이루리 블랙 트렌치 트임 원피스 벨트", occasion));
  assert.ok(!isWrongOccasion("가을 겨울원피스 슬림핏 긴팔원피스 목폴라", occasion));
});

test("시기를 적었으면 지금이 언제든 그 시기로 본다", () => {
  const summerNow = new Date("2026-07-15T00:00:00+09:00");
  assert.equal(detectOccasion("추석에 입을 옷", summerNow).season, "autumn");
  assert.equal(detectOccasion("설날 한복 대신 입을 옷", summerNow).season, "winter");
  // 안 적었으면 지금 달로 본다.
  assert.equal(detectOccasion("단정한 옷", summerNow).season, "summer");
});

test("달로 계절을 정한다", () => {
  assert.equal(seasonOfMonth(4), "spring");
  assert.equal(seasonOfMonth(7), "summer");
  assert.equal(seasonOfMonth(10), "autumn");
  assert.equal(seasonOfMonth(1), "winter");
});

test("반대 계절만 거른다", () => {
  const summer = detectOccasion("여름휴가에 입을 옷", AUTUMN);
  assert.ok(isWrongOccasion("겨울 기모 맨투맨", summer));
  assert.ok(!isWrongOccasion("냉감 반팔 티셔츠", summer));

  // 봄은 겨울옷도 여름옷도 입을 만해서 거르지 않는다.
  const spring = detectOccasion("봄에 입을 옷", AUTUMN);
  assert.ok(!isWrongOccasion("기모 맨투맨", spring));
  assert.ok(!isWrongOccasion("린넨 셔츠", spring));
});

test("격식 있는 자리에 캐주얼한 옷을 올리지 않는다", () => {
  const formal = detectOccasion("상견례에 입을 옷", AUTUMN);
  assert.equal(formal.formal, true);
  assert.ok(isWrongOccasion("시스루 미니원피스", formal));
  assert.ok(isWrongOccasion("오프숄더 크롭 니트", formal));
  assert.ok(!isWrongOccasion("무릎 아래 A라인 원피스", formal));
});

test("하객 자리에서는 흰 원피스를 뺀다", () => {
  const wedding = detectOccasion("친구 결혼식 하객으로 입을 옷", AUTUMN);
  assert.equal(wedding.wedding, true);
  assert.ok(isWrongOccasion("화이트 롱원피스 하객룩", wedding));
  // 흰색이어도 원피스가 아니면 신부와 겹치지 않는다.
  assert.ok(!isWrongOccasion("아이보리 트위드 자켓", wedding));
  // 하객이 아니면 흰 원피스도 거르지 않는다.
  const dinner = detectOccasion("시댁 모임에 입을 옷", AUTUMN);
  assert.ok(!isWrongOccasion("화이트 롱원피스", dinner));
});

test("격식 자리가 아니면 캐주얼을 거르지 않는다", () => {
  const casual = detectOccasion("주말에 편하게 입을 옷", AUTUMN);
  assert.equal(casual.formal, false);
  assert.ok(!isWrongOccasion("크롭 맨투맨", casual));
});
