import { strict as assert } from "node:assert";
import test from "node:test";

import { toMapKeyword } from "../src/lib/recommendation/map-keyword.ts";

test("상품형 문구를 지도에서 검색되는 메뉴명으로 줄인다", () => {
  assert.equal(toMapKeyword("1인용 냉동삼겹살 밀키트"), "삼겹살");
  assert.equal(toMapKeyword("2인분 국밥 간편식"), "국밥");
  assert.equal(toMapKeyword("모둠전 밀키트 세트"), "모둠전");
});

test("이미 지도에서 통하는 짧은 메뉴명은 그대로 둔다", () => {
  assert.equal(toMapKeyword("삼겹살"), "삼겹살");
  assert.equal(toMapKeyword("이자카야"), "이자카야");
});

test("단어가 많으면 앞 두 개만 남긴다", () => {
  assert.equal(toMapKeyword("분위기 좋은 이자카야 추천"), "분위기 좋은");
});
