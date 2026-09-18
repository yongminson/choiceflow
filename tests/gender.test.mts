import { strict as assert } from "node:assert";
import test from "node:test";

import {
  applyAudienceToKeyword,
  detectAudience,
  hasChildSizeRange,
  isChildProduct,
  isWrongAudience,
  extractWearer,
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

/*
  상황 설명에 나오는 사람과 쓸 사람을 가려낸다.

  "아이 등원 후 아침 걷기를 시작하려고요, 40대 여성이 처음 사는
  운동복이에요"에서 아이는 입을 사람이 아니다. 그런데 문장 전체를
  훑으니 아이를 착용자로 읽어 후보 셋이 전부 아동복으로 나갔고,
  맞는 상품인 "여성 러닝 레깅스"는 오히려 걸러졌다.
*/
const ADULT_WISH =
  "아이 등원 후 아침 걷기를 시작하려고요, 40대 여성이 처음 사는 운동복이에요";

test("상황에 나오는 아이를 착용자로 보지 않는다", () => {
  const audience = detectAudience(ADULT_WISH);
  assert.equal(audience?.ageGroup, "adult");
  assert.equal(audience?.gender, "female");
  assert.equal(audience?.term, "여성");
});

test("검색어에 아동 표시가 붙지 않는다", () => {
  const audience = detectAudience(ADULT_WISH);
  const keyword = applyAudienceToKeyword("운동복 세트", audience);
  assert.equal(keyword.includes("여아"), false);
  assert.equal(keyword.includes("아동"), false);
});

test("성인 요청에서 아동복은 전부 빠진다", () => {
  const audience = detectAudience(ADULT_WISH);
  assert.ok(audience);
  for (const product of [
    "버니덴 프리미엄 시크릿 주니어 필라테스 요가레깅스",
    "키즈크루 아동용 기모 리본포 상하세트",
    "초등생 여아 후드 바람막이 점퍼",
  ]) {
    assert.equal(isWrongAudience(product, audience), true, product);
  }
  assert.equal(isWrongAudience("나이키 여성 러닝 레깅스", audience), false);
});

test("아이가 쓸 물건이라고 적으면 아이로 읽는다", () => {
  const audience = detectAudience("6살 아이가 신을 운동화 사려고요");
  assert.equal(audience?.ageGroup, "child");
  assert.equal(isWrongAudience("나이키 성인 러닝화 280", audience!), true);
});

test("쓸 사람을 안 적었으면 문장 전체를 본다", () => {
  const audience = detectAudience("여성 니트 추천해 주세요");
  assert.equal(audience?.gender, "female");
  assert.equal(audience?.ageGroup, "adult");
});

test("착용자 토막을 그대로 꺼낸다", () => {
  assert.ok(extractWearer(ADULT_WISH)?.includes("40대 여성"));
  assert.ok(extractWearer("6살 아이가 신을 운동화")?.includes("아이"));
  assert.equal(extractWearer("운동복 추천"), undefined);
});

/*
  실제로 적힐 법한 문장들을 한 줄로 묶어 둔다.

  대상을 잘못 읽으면 검색어가 흔들려 후보 전체가 어긋난다. 한 건씩
  고치다 보면 다른 문장이 깨지므로, 고칠 때마다 이 묶음을 함께 돌린다.
*/
const WEARER_CASES: [string, string | undefined][] = [
  ["아이 등원 후 아침 걷기, 40대 여성이 처음 사는 운동복이에요", "여성"],
  ["6살 아이가 신을 운동화 사려고요", "아동"],
  ["남편 생일선물로 30대 남성 지갑", "남성"],
  ["초등학생 딸 겨울 패딩", "여아"],
  ["아들 축구화 사주려고요", "남아"],
  ["아이랑 같이 입을 커플 후드, 저는 40대 엄마", "여성"],
  ["70대 어머니 편한 신발", "여성"],
  ["중학생 아들이 입을 패딩", "남아"],
  ["와이프 겨울 코트", "여성"],
  ["운동복 추천", undefined],
];

test("적힐 법한 문장에서 쓸 사람을 제대로 읽는다", () => {
  for (const [wish, expected] of WEARER_CASES) {
    const audience = detectAudience(wish);
    assert.equal(audience?.term, expected, wish);
  }
});

test("아이가 상황에만 나오면 검색어에 아동 표시가 안 붙는다", () => {
  for (const wish of [
    "아이 등원 후 아침 걷기, 40대 여성이 처음 사는 운동복이에요",
    "아이랑 같이 입을 커플 후드, 저는 40대 엄마",
  ]) {
    const keyword = applyAudienceToKeyword("운동복", detectAudience(wish));
    assert.equal(keyword.includes("아동"), false, wish);
    assert.equal(keyword.includes("여아"), false, wish);
  }
});
