import { strict as assert } from "node:assert";
import test from "node:test";

import { toMapKeyword } from "../src/lib/recommendation/map-keyword.ts";

test("상품형 문구를 지도에서 검색되는 업종명으로 줄인다", () => {
  assert.equal(toMapKeyword("1인용 냉동삼겹살 밀키트"), "삼겹살");
  assert.equal(toMapKeyword("미니 화로 어묵탕 밀키트"), "어묵탕");
  assert.equal(toMapKeyword("2인분 국밥 간편식"), "국밥");
  assert.equal(toMapKeyword("모둠전 밀키트 세트"), "모둠전");
});

test("이미 지도에서 통하는 메뉴명은 그대로 둔다", () => {
  assert.equal(toMapKeyword("삼겹살"), "삼겹살");
  assert.equal(toMapKeyword("이자카야"), "이자카야");
});

test("수식어를 걷어내고 업종만 남긴다", () => {
  assert.equal(toMapKeyword("분위기 좋은 이자카야"), "이자카야");
  assert.equal(toMapKeyword("얼큰한 짬뽕"), "짬뽕");
});

test("모두 걸러져도 빈 문자열을 만들지 않는다", () => {
  assert.equal(toMapKeyword("밀키트"), "밀키트");
});
