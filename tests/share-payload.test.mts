import { strict as assert } from "node:assert";
import test from "node:test";

import {
  readSharedResultPayload,
  sharePreviewText,
  toSharedResultPayload,
} from "../src/lib/share/share-payload.ts";

const baseResult = {
  categoryId: "appliance",
  quickScenarioLabel: "원룸 자취방",
  quickPriorityLabel: "조용함",
  quickBudgetLabel: "20만원 이하",
  quickUserWish: "원룸이라 작고 조용한 걸로",
  quickRecommendations: [
    {
      rank: 1,
      name: "저소음 무선청소기",
      reason: "원룸이라면 소음이 체감 차이를 만듭니다.",
      searchKeyword: "저소음 무선청소기",
      qualitySummary: "소음 dB 표기를 확인하세요.",
      price: 169000,
      sourceUrl: "https://link.coupang.com/a/abc",
      imageUrl: "https://static.coupangcdn.com/x.jpg",
      selectionType: "best" as const,
      fitChecks: [
        { ok: true, text: "예산 안에 들어옴" },
        { ok: false, text: "카펫은 아쉬움" },
      ],
    },
  ],
};

test("공유할 결과에서 표시에 필요한 값만 남긴다", () => {
  const payload = toSharedResultPayload(baseResult);
  assert.ok(payload);
  assert.equal(payload.categoryId, "appliance");
  assert.equal(payload.scenarioLabel, "원룸 자취방");
  assert.equal(payload.userWish, "원룸이라 작고 조용한 걸로");
  assert.equal(payload.recommendations.length, 1);
  assert.equal(payload.recommendations[0].price, 169000);
});

test("추천 후보가 없으면 공유하지 않는다", () => {
  assert.equal(toSharedResultPayload({ quickRecommendations: [] }), null);
  assert.equal(toSharedResultPayload({}), null);
  assert.equal(toSharedResultPayload(null), null);
  assert.equal(toSharedResultPayload("문자열"), null);
});

test("이름이 없는 후보는 버린다", () => {
  const payload = toSharedResultPayload({
    quickRecommendations: [
      { name: "", reason: "x" },
      { name: "정상 후보", reason: "y" },
    ],
  });
  assert.equal(payload?.recommendations.length, 1);
  assert.equal(payload?.recommendations[0].name, "정상 후보");
});

test("https 가 아닌 링크는 실어 보내지 않는다", () => {
  // 공유 페이지는 남이 여는 화면이다. javascript: 같은 주소가 그대로
  // 버튼에 실리면 링크를 받은 사람이 피해를 본다.
  const payload = toSharedResultPayload({
    quickRecommendations: [
      {
        name: "후보",
        reason: "이유",
        // eslint-disable-next-line no-script-url
        sourceUrl: "javascript:alert(1)",
        imageUrl: "http://insecure.example.com/a.png",
      },
    ],
  });
  assert.equal(payload?.recommendations[0].sourceUrl, undefined);
  assert.equal(payload?.recommendations[0].imageUrl, undefined);
});

test("후보는 4개까지만 담는다", () => {
  const payload = toSharedResultPayload({
    quickRecommendations: Array.from({ length: 9 }, (_, i) => ({
      name: `후보 ${i}`,
      reason: "이유",
    })),
  });
  assert.equal(payload?.recommendations.length, 4);
});

test("긴 문장은 잘라서 저장한다", () => {
  const payload = toSharedResultPayload({
    quickRecommendations: [{ name: "가".repeat(300), reason: "나".repeat(900) }],
  });
  assert.equal(payload?.recommendations[0].name.length, 80);
  assert.equal(payload?.recommendations[0].reason.length, 400);
});

test("저장했다 다시 읽어도 같은 결과가 나온다", () => {
  const stored = toSharedResultPayload(baseResult);
  const roundTripped = readSharedResultPayload(
    JSON.parse(JSON.stringify(stored))
  );
  assert.deepEqual(roundTripped, stored);
});

test("미리보기 문구에 1등과 조건이 들어간다", () => {
  const payload = toSharedResultPayload(baseResult);
  assert.ok(payload);
  const preview = sharePreviewText(payload);
  assert.ok(preview.title.includes("저소음 무선청소기"));
  assert.ok(preview.title.includes("원룸 자취방"));
  assert.ok(preview.description.length > 0);
});
