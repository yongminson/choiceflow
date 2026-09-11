import { strict as assert } from "node:assert";
import test from "node:test";

import {
  detectCleaningNeed,
  isOffMethod,
  isWrongCleaning,
  productMethod,
  productSurface,
} from "../src/lib/recommendation/cleaning-match.ts";

/* 사용자가 실제로 적은 글과 화면에 올라온 상품들. */
const WISH =
  "손걸레질 대신 쓸 물걸레 청소기, 6살 아이가 바닥에서 놀아서 자주 닦아야 해요";

const WINDOW_ROBOT = "루미에뜨 고층 아파트 베란다 유리창 청소 로봇 청소기";
const VACUUM = "포유디지탈 무선 아쿠아 진공 청소기";
const MOP = "스핑글 양방향 무선 물걸레청소기 GC-6300";
const STEAM = "2026년형 NICESUN 고온 스팀청소기 1300W";

test("바닥을 물걸레로 닦겠다는 요청을 읽는다", () => {
  const need = detectCleaningNeed(WISH, "청소·세탁");
  assert.equal(need?.surface, "floor");
  assert.equal(need?.method, "mop");
});

test("청소 이야기가 아니면 잣대를 대지 않는다", () => {
  assert.equal(detectCleaningNeed("밥솥 추천해 주세요", "주방"), undefined);
});

test("유리창 로봇은 바닥 요청에서 빠진다", () => {
  const need = detectCleaningNeed(WISH, "청소·세탁");
  assert.equal(productSurface(WINDOW_ROBOT), "window");
  assert.equal(isWrongCleaning(WINDOW_ROBOT, need), true);
});

test("바닥용 제품은 방식이 달라도 일단 남는다", () => {
  const need = detectCleaningNeed(WISH, "청소·세탁");
  for (const product of [MOP, VACUUM, STEAM]) {
    assert.equal(isWrongCleaning(product, need), false, product);
  }
});

test("다른 방식을 하나 쓴 뒤에는 더 받지 않는다", () => {
  const need = detectCleaningNeed(WISH, "청소·세탁");
  assert.equal(isWrongCleaning(MOP, need, true), false);
  assert.equal(isWrongCleaning(VACUUM, need, true), true);
  assert.equal(isWrongCleaning(STEAM, need, true), true);
});

test("요청한 방식과 다른지 센다", () => {
  const need = detectCleaningNeed(WISH, "청소·세탁");
  assert.equal(isOffMethod(MOP, need), false);
  assert.equal(isOffMethod(VACUUM, need), true);
  assert.equal(productMethod(STEAM), "steam");
});

test("침구·의류 제품도 바닥 요청에서 빠진다", () => {
  const need = detectCleaningNeed(WISH, "청소·세탁");
  assert.equal(isWrongCleaning("레이캅 침구청소기 진드기", need), true);
  assert.equal(isWrongCleaning("LG 스타일러 의류관리기", need), true);
});

test("방식을 안 적었으면 방식으로 거르지 않는다", () => {
  const need = detectCleaningNeed("바닥 청소기 추천", "청소·세탁");
  assert.equal(need?.surface, "floor");
  assert.equal(need?.method, undefined);
  assert.equal(isWrongCleaning(VACUUM, need, true), false);
});

test("방식을 알 수 없는 상품은 막지 않는다", () => {
  const need = detectCleaningNeed(WISH, "청소·세탁");
  assert.equal(isWrongCleaning("샤오미 청소기 화이트", need, true), false);
});
