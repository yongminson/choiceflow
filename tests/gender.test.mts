import { strict as assert } from "node:assert";
import test from "node:test";

import {
  applyGenderToKeyword,
  detectGender,
} from "../src/lib/recommendation/gender.ts";

test("적어 주신 글에서 성별을 읽는다", () => {
  // 실제로 나갔던 요청이다.
  assert.equal(detectGender("6살 남아 유치원 신을 가을 운동화")?.term, "남아");
  assert.equal(detectGender("7살 여아 어린이집 가방")?.term, "여아");
  assert.equal(detectGender("아들 초등 입학 선물")?.term, "남아");
  assert.equal(detectGender("딸 유치원 원복")?.term, "여아");
});

test("어린이를 가리키는 말이 없으면 어른으로 본다", () => {
  assert.equal(detectGender("남편 생일 선물")?.term, "남성");
  assert.equal(detectGender("여자친구 출근용 가방")?.term, "여성");
});

test("성별을 알 수 없으면 아무것도 정하지 않는다", () => {
  // 잘못 짚은 성별로 거르는 것이 안 거르는 것보다 나쁘다.
  assert.equal(detectGender("가을 운동화 추천"), undefined);
  assert.equal(detectGender(""), undefined);
  // 양쪽이 다 나오면 누구 것인지 알 수 없다.
  assert.equal(detectGender("남아 여아 둘 다 신을 운동화"), undefined);
  // 남녀공용을 찾는 사람에게 한쪽을 강요하지 않는다.
  assert.equal(detectGender("남녀공용 맨투맨"), undefined);
});

test("성별과 무관한 '남아'는 성별로 읽지 않는다", () => {
  // "재고가 남아있는"처럼 쓰이는 경우다.
  assert.equal(detectGender("작년에 사고 남아있는 옷 말고 새로"), undefined);
  // 다른 근거가 따로 있으면 그것은 살린다.
  assert.equal(detectGender("남성 정장, 작년 것 남아있지만 새로")?.term, "남성");
});

test("검색어에 성별을 넣는다", () => {
  const male = detectGender("6살 남아 유치원 신을 가을 운동화");
  // 성별 없는 말이 있으면 그 자리를 대신한다.
  assert.equal(applyGenderToKeyword("아동용 벨크로 운동화", male), "남아 벨크로 운동화");
  assert.equal(applyGenderToKeyword("키즈 스니커즈", male), "남아 스니커즈");
  // 없으면 앞에 붙인다.
  assert.equal(applyGenderToKeyword("벨크로 운동화", male), "남아 벨크로 운동화");
  // 이미 들어 있으면 그대로 둔다.
  assert.equal(applyGenderToKeyword("남아 벨크로 운동화", male), "남아 벨크로 운동화");
});

test("성별을 모르면 검색어를 건드리지 않는다", () => {
  assert.equal(
    applyGenderToKeyword("아동용 벨크로 운동화", undefined),
    "아동용 벨크로 운동화"
  );
});

test("반대 성별 상품을 걸러낼 수 있다", () => {
  const male = detectGender("6살 남아 유치원 신을 가을 운동화");
  assert.ok(male);
  // 실제로 1등으로 걸렸던 상품이다.
  assert.ok(male.rejectPattern.test("캐치티니핑 발광운동화 메리제인 LED"));
  assert.ok(male.rejectPattern.test("여아용 공주 구두"));
  assert.ok(!male.rejectPattern.test("아동 조이 다이얼 운동화 LE4W240"));

  const female = detectGender("7살 여아 운동화");
  assert.ok(female);
  assert.ok(female.rejectPattern.test("파워레인저 아동 운동화"));
  assert.ok(!female.rejectPattern.test("캐치티니핑 발광운동화"));
});
