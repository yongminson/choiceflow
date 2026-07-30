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
