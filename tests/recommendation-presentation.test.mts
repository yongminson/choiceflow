import assert from "node:assert/strict";
import test from "node:test";

import {
  categoryEvidence,
  normalizeProductSearchKeyword,
} from "../src/lib/recommendation/recommendation-presentation.ts";

test("keeps Coupang queries concise and limited to one product", () => {
  assert.equal(
    normalizeProductSearchKeyword(
      "수제 초콜릿 세트, 마카롱 선물 세트, 미니 꽃다발 배달",
      "초콜릿 선물"
    ),
    "수제 초콜릿 세트"
  );
  assert.equal(
    normalizeProductSearchKeyword(
      "100페이지 포토북 웨딩앨범품질 만들기 D : 제목없음",
      "포토북"
    ),
    "100페이지 포토북 웨딩앨범품질 만들기"
  );
});

test("does not attach appliance criteria to gifts or fashion", () => {
  const giftText = categoryEvidence("gift", "기념일에 맞는 후보")
    .map((item) => `${item.label} ${item.text}`)
    .join(" ");
  const fashionText = categoryEvidence("fashion", "출근용 후보")
    .map((item) => `${item.label} ${item.text}`)
    .join(" ");
  const applianceText = categoryEvidence("appliance", "청소용 후보")
    .map((item) => `${item.label} ${item.text}`)
    .join(" ");

  assert.doesNotMatch(giftText, /A\/S|감가/);
  assert.doesNotMatch(fashionText, /A\/S|감가/);
  assert.match(applianceText, /A\/S/);
  assert.match(applianceText, /감가/);
});

test("되팔 수 없는 것에 감가·재판매 기준을 붙이지 않는다", () => {
  // 통신 요금제 카드에 "처분 가치 — 보유 기간 뒤 재판매 수요와 예상 감가"가
  // 붙어 나갔다. 요금제는 되팔 수 있는 물건이 아니라 아무 뜻도 없는 줄이 된다.
  const text = (scenarioId: string) =>
    categoryEvidence("asset", "월 고정 지출을 줄이는 후보", scenarioId)
      .map((item) => `${item.label} ${item.text}`)
      .join(" ");

  for (const scenarioId of ["subscription", "insurance", "rental"]) {
    assert.doesNotMatch(text(scenarioId), /감가|재판매|처분 가치/);
  }
});

test("계약으로 묶이는 용도에는 빠져나올 때 드는 비용을 보여준다", () => {
  assert.match(text("subscription"), /위약금/);
  assert.match(text("insurance"), /해지환급금|갱신/);
  assert.match(text("rental"), /의무 사용 기간|위약금/);

  function text(scenarioId: string) {
    return categoryEvidence("asset", "후보", scenarioId)
      .map((item) => `${item.label} ${item.text}`)
      .join(" ");
  }
});

test("되팔 수 있는 것에는 감가·환금성을 그대로 둔다", () => {
  const car = categoryEvidence("asset", "후보", "car")
    .map((item) => `${item.label} ${item.text}`)
    .join(" ");
  const property = categoryEvidence("asset", "후보", "property")
    .map((item) => `${item.label} ${item.text}`)
    .join(" ");

  assert.match(car, /감가/);
  assert.match(property, /환금성|시세/);
});

test("용도를 모르면 어느 쪽 기준도 단정하지 않는다", () => {
  const text = categoryEvidence("asset", "후보")
    .map((item) => `${item.label} ${item.text}`)
    .join(" ");
  assert.doesNotMatch(text, /감가|재판매|위약금/);
  assert.match(text, /계약 위험/);
});
