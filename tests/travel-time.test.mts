import { strict as assert } from "node:assert";
import test from "node:test";

import {
  collectTravelMinutes,
  normalizeTravelTime,
  pickTravelMinutes,
  rewriteTravelMinutes,
} from "../src/lib/recommendation/travel-time.ts";

test("한 후보 안에서 갈리던 시간을 하나로 맞춘다", () => {
  // 실제로 나갔던 카드다. 같은 숙소인데 35분과 40분이 함께 떴다.
  const fixed = normalizeTravelTime({
    reason: "아산에서 차로 35분 거리에 위치하여 동선 부담이 적습니다.",
    fitChecks: [
      { text: "아산에서 차로 40분 내 도착 가능" },
      { text: "6살 아이가 야외 활동에 최적화" },
    ],
  });

  assert.match(fixed.reason ?? "", /차로 35분/);
  assert.equal(fixed.fitChecks?.[0].text, "아산에서 차로 35분 내 도착 가능");
  assert.equal(fixed.fitChecks?.[1].text, "6살 아이가 야외 활동에 최적화");
});

test("AI 가 따로 적어 준 값이 있으면 그것을 쓴다", () => {
  const fixed = normalizeTravelTime(
    { reason: "차로 35분 거리입니다.", fitChecks: [{ text: "40분 내 도착 가능" }] },
    25
  );
  assert.match(fixed.reason ?? "", /차로 25분/);
  assert.equal(fixed.fitChecks?.[0].text, "25분 내 도착 가능");
});

test("여러 번 나온 값을 대표로 삼는다", () => {
  assert.equal(pickTravelMinutes(undefined, ["차로 30분", "30분 거리", "40분 내"]), 30);
});

test("이동 시간이 없으면 건드리지 않는다", () => {
  const candidate = {
    reason: "넓은 잔디 마당이 있어 아이가 뛰어놀기 좋습니다.",
    fitChecks: [{ text: "예산 20만원 이내" }],
  };
  assert.deepEqual(normalizeTravelTime(candidate), candidate);
});

test("이동과 무관한 분은 바꾸지 않는다", () => {
  assert.deepEqual(collectTravelMinutes(["저녁에 30분 산책하기 좋습니다"]), []);
  assert.equal(
    rewriteTravelMinutes("저녁에 30분 산책하기 좋습니다", 15),
    "저녁에 30분 산책하기 좋습니다"
  );
});

test("걸어서·버스로도 함께 맞춘다", () => {
  assert.equal(rewriteTravelMinutes("걸어서 10분 거리", 7), "걸어서 7분 거리");
  assert.equal(rewriteTravelMinutes("버스로 약 25분", 20), "버스로 약 20분");
});

test("말이 안 되는 값은 이동 시간으로 보지 않는다", () => {
  assert.deepEqual(collectTravelMinutes(["차로 0분", "차로 999분"]), []);
  assert.equal(pickTravelMinutes(0, ["차로 35분"]), 35);
});
