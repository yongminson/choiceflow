import { strict as assert } from "node:assert";
import test from "node:test";

import {
  detectTargetItem,
  matchesTargetItem,
} from "../src/lib/recommendation/item-match.ts";

test("실제로 나갔던 화면을 잡는다 — 니트 요청에 팔토시와 바지", () => {
  const wish =
    "작년에 산 여성 니트가 두 번 빨고 보풀 나서 버렸어요, 세탁기에 그냥 돌릴 수 있는 가을 니트";
  const target = detectTargetItem(wish);
  assert.equal(target?.name, "니트");

  // 후보에 실제로 올라왔던 상품들이다.
  assert.ok(!matchesTargetItem("해피제이 아이스 아웃도어 UV차단 팔토시 손등형", target));
  assert.ok(
    !matchesTargetItem("100kg까지 빅사이즈 여성 모직 정장 와이드 양털 7부", target)
  );
  // 니트류는 통과해야 한다.
  assert.ok(matchesTargetItem("103st 여성 데일리 라운드 니트 17컬러", target));
  assert.ok(matchesTargetItem("무이담 여성용 라운드넥 니트 티셔츠 1개", target));
});

test("같은 자리에 놓아도 되는 품목은 함께 통과한다", () => {
  const target = detectTargetItem("가을 니트 사고 싶어요");
  assert.ok(matchesTargetItem("케이블 가디건 오버핏", target));
  assert.ok(matchesTargetItem("울 스웨터 라운드넥", target));
  assert.ok(!matchesTargetItem("데님 청바지 와이드", target));
});

test("품목을 적지 않았으면 아무것도 거르지 않는다", () => {
  assert.equal(detectTargetItem("편하게 입을 옷 추천해주세요"), undefined);
  assert.equal(detectTargetItem(""), undefined);
  // 거를 기준이 없으면 전부 통과시킨다.
  assert.ok(matchesTargetItem("아무 상품", undefined));
});

test("품목이 여러 개면 정하지 않는다", () => {
  // 한쪽만 남기면 나머지 절반을 버리는 셈이다.
  assert.equal(detectTargetItem("니트랑 바지 같이 살 거예요"), undefined);
});

test("생활가전 품목도 알아본다", () => {
  const target = detectTargetItem("3년 쓴 에어프라이어 코팅이 벗겨져서 교체");
  assert.equal(target?.name, "에어프라이어");
  assert.ok(matchesTargetItem("리빙웰 30L 대용량 에어프라이어", target));
  assert.ok(!matchesTargetItem("스테인리스 전기포트 1.8L", target));
});

test("용도 이름도 함께 본다", () => {
  // 자유입력이 비어도 용도에 품목이 있으면 그것을 쓴다.
  const target = detectTargetItem("", "청소기 고르기");
  assert.equal(target?.name, "청소기");
});
