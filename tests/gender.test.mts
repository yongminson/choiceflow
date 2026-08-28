import { strict as assert } from "node:assert";
import test from "node:test";

import {
  applyAudienceToKeyword,
  detectAudience,
  hasChildSizeRange,
  isChildProduct,
  isWrongAudience,
} from "../src/lib/recommendation/gender.ts";

test("실제로 나갔던 오판을 잡는다 — 세탁기의 '세'", () => {
  /*
    "여성 니트"라고 적었는데 후보 넷이 전부 아동복으로 나갔다.
    나이를 뜻하는 "세"가 낱말째로 들어 있어 "세탁기"에 걸린 탓이었다.
  */
  const wish =
    "작년에 산 여성 니트가 두 번 빨고 보풀 나서 버렸어요, 세탁기에 그냥 돌릴 수 있는 가을 니트";
  const audience = detectAudience(wish);
  assert.equal(audience?.term, "여성");
  assert.equal(audience?.ageGroup, "adult");
  assert.equal(applyAudienceToKeyword("가을 니트", audience), "여성 가을 니트");
});

test("나이는 숫자에 붙어 있을 때만 나이로 본다", () => {
  assert.equal(detectAudience("6살 남아 유치원 신을 운동화")?.term, "남아");
  assert.equal(detectAudience("7세 여아 어린이집 가방")?.term, "여아");
  // 흔한 말 안에 숨은 글자에는 걸리지 않는다.
  assert.equal(detectAudience("여성 세탁기용 니트")?.term, "여성");
  assert.equal(detectAudience("남성 살림용 앞치마")?.term, "남성");
  assert.equal(detectAudience("여성 아이보리 코트")?.term, "여성");
  assert.equal(detectAudience("남성 아이템 추천")?.term, "남성");
});

test("딸기는 딸이 아니다", () => {
  assert.equal(detectAudience("딸기 케이크 선물"), undefined);
  assert.equal(detectAudience("딸 유치원 원복")?.term, "여아");
});

test("어른임이 분명하면 나이 단서가 있어도 어른으로 본다", () => {
  assert.equal(detectAudience("남편 생일 선물")?.term, "남성");
  assert.equal(detectAudience("출근용 여성 가방")?.term, "여성");
});

test("성별을 몰라도 아동이면 아동으로 검색한다", () => {
  const audience = detectAudience("6살 아이 신을 운동화");
  assert.equal(audience?.ageGroup, "child");
  assert.equal(audience?.term, "아동");
  assert.equal(applyAudienceToKeyword("가을 운동화", audience), "아동 가을 운동화");
});

test("확실하지 않으면 아무것도 정하지 않는다", () => {
  assert.equal(detectAudience("가을 운동화 추천"), undefined);
  assert.equal(detectAudience(""), undefined);
  assert.equal(detectAudience("남아 여아 둘 다 신을 운동화"), undefined);
  assert.equal(detectAudience("남녀공용 맨투맨"), undefined);
  assert.equal(detectAudience("작년에 사고 남아있는 옷 말고 새로"), undefined);
});

test("성인 요청에서 아동복을 걸러낸다", () => {
  const audience = detectAudience("여성 가을 니트");
  assert.ok(audience);
  // 실제로 후보에 올라왔던 상품들이다.
  for (const name of [
    "어린이 하트 니트 가디건",
    "여누키즈 키즈 주니어 리본 긴팔 티셔츠 100~150 봄",
    "스타빈 여아용 꽈배기 반팔 니트",
    "여누키즈 리본 꽈베기 니트 가디건 110~140 키즈 주니어",
  ]) {
    assert.ok(isWrongAudience(name, audience), name);
  }
  // 성인 여성복은 통과해야 한다.
  assert.ok(!isWrongAudience("여성 케이블 니트 가디건 오버핏", audience));
});

test("사이즈 범위 표기로도 아동복을 알아본다", () => {
  assert.ok(hasChildSizeRange("리본 니트 가디건 110~140"));
  assert.ok(hasChildSizeRange("긴팔 티셔츠 100-150"));
  // 아동복 치수대가 아닌 숫자 범위는 아니다.
  assert.ok(!hasChildSizeRange("커피포트 1.8L 2000-3000W"));
  assert.ok(isChildProduct("주니어 맨투맨"));
  assert.ok(!isChildProduct("여성 니트 가디건"));
});

test("아동 요청에서는 성인복을 걸러낸다", () => {
  const audience = detectAudience("6살 여아 니트");
  assert.ok(audience);
  assert.ok(isWrongAudience("여성용 케이블 니트", audience));
  assert.ok(!isWrongAudience("여아 꽈배기 니트 110", audience));
});

test("반대 성별 캐릭터 상품도 걸러낸다", () => {
  const male = detectAudience("6살 남아 유치원 신을 가을 운동화");
  assert.ok(male);
  assert.ok(isWrongAudience("캐치티니핑 발광운동화 메리제인 LED", male));
  assert.ok(!isWrongAudience("아동 조이 다이얼 운동화 LE4W240", male));
});
