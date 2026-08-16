import { strict as assert } from "node:assert";
import test from "node:test";

import {
  derivedFitChecks,
  placeFitChecks,
  readFitChecks,
} from "../src/lib/recommendation/fit-checks.ts";

test("충족·미충족이 함께 있으면 체크리스트로 쓴다", () => {
  const parsed = readFitChecks([
    { ok: true, text: "예산 안에 들어옴" },
    { ok: false, text: "카펫 흡입력은 아쉬움" },
    { ok: true, text: "원룸에 세워둘 수 있는 크기" },
  ]);
  // AI 가 쓴 항목은 실제 상품을 보고 쓴 것이 아니므로 guide 로 표시된다.
  assert.deepEqual(parsed, [
    { ok: true, text: "예산 안에 들어옴", source: "guide" },
    { ok: true, text: "원룸에 세워둘 수 있는 크기", source: "guide" },
    { ok: false, text: "카펫 흡입력은 아쉬움", source: "guide" },
  ]);
});

test("단점이 하나도 없으면 체크리스트를 쓰지 않는다", () => {
  // 장점만 나열되면 광고 문구가 된다. 이럴 땐 줄글 이유로 되돌아가야 한다.
  assert.equal(
    readFitChecks([
      { ok: true, text: "예산 안에 들어옴" },
      { ok: true, text: "조용함" },
      { ok: true, text: "가벼움" },
    ]),
    undefined
  );
});

test("충족 항목이 2개 미만이면 체크리스트를 쓰지 않는다", () => {
  assert.equal(
    readFitChecks([
      { ok: true, text: "예산 안에 들어옴" },
      { ok: false, text: "무거움" },
    ]),
    undefined
  );
});

test("배열이 아니거나 빈 문장이면 버린다", () => {
  assert.equal(readFitChecks("예산 안에 들어옴"), undefined);
  assert.equal(readFitChecks(undefined), undefined);
  assert.equal(
    readFitChecks([{ ok: true, text: "  " }, { ok: false, text: "" }]),
    undefined
  );
});

test("ok 가 없으면 충족으로 본다", () => {
  const parsed = readFitChecks([
    { text: "예산 안에 들어옴" },
    { text: "조용함" },
    { ok: false, text: "무거움" },
  ]);
  assert.deepEqual(parsed?.map((item) => item.ok), [true, true, false]);
});

test("확인된 가격·배송만으로 체크리스트를 만든다", () => {
  assert.deepEqual(
    derivedFitChecks(
      {
        rank: 1,
        name: "무선청소기",
        reason: "",
        searchKeyword: "",
        qualitySummary: "",
        price: 169000,
        isRocket: true,
      },
      200000
    ),
    [
      // 후보끼리 갈리도록 예산 대비 비율을 쓴다. 넷이 모두 "예산 안에 들어옴"이면
      // 확인된 항목이 후보를 고르는 데 도움이 되지 않는다.
      { ok: true, text: "예산의 85% 수준", source: "verified" },
      { ok: true, text: "로켓배송으로 바로 받음", source: "verified" },
    ]
  );
});

test("예산을 넘으면 얼마나 넘는지 밝힌다", () => {
  const checks = derivedFitChecks(
    {
      rank: 1,
      name: "무선청소기",
      reason: "",
      searchKeyword: "",
      qualitySummary: "",
      price: 249000,
      isRocket: true,
    },
    200000
  );
  assert.equal(checks?.[0].ok, false);
  assert.equal(checks?.[0].text, "예산을 49,000원 넘음");
});

test("후보 중 가장 싼 것에만 표시한다", () => {
  const base = {
    rank: 1,
    name: "무선청소기",
    reason: "",
    searchKeyword: "",
    qualitySummary: "",
    isRocket: true,
  };
  const cheap = derivedFitChecks({ ...base, price: 59000 }, 200000, {
    cheapestPrice: 59000,
  });
  const other = derivedFitChecks({ ...base, price: 169000 }, 200000, {
    cheapestPrice: 59000,
  });

  assert.ok(cheap?.some((item) => item.text === "후보 중 가장 저렴함"));
  assert.ok(!other?.some((item) => item.text === "후보 중 가장 저렴함"));
});

test("확인된 사실이 부족하면 지어내지 않는다", () => {
  // 가격만 있고 다른 근거가 없으면 한 줄짜리 체크리스트가 된다. 그건 안 만든다.
  assert.equal(
    derivedFitChecks(
      {
        rank: 1,
        name: "무선청소기",
        reason: "",
        searchKeyword: "",
        qualitySummary: "",
        price: 169000,
      },
      200000
    ),
    undefined
  );
  assert.equal(
    derivedFitChecks({
      rank: 1,
      name: "무선청소기",
      reason: "",
      searchKeyword: "",
      qualitySummary: "",
    }),
    undefined
  );
});

test("확인된 사실을 앞에 두고 AI 판단을 뒤에 붙인다", () => {
  // 실제 판매가·배송은 조회 결과라 사실이고, AI 항목은 상품을 보지 않고 쓴 것이다.
  // 둘을 합치되 순서와 표시를 나눠 어느 쪽이 확인된 것인지 알 수 있게 한다.
  const merged = derivedFitChecks(
    {
      rank: 1,
      name: "무선청소기",
      reason: "",
      searchKeyword: "",
      qualitySummary: "",
      price: 169000,
      isRocket: true,
      fitChecks: [
        { ok: true, text: "30평대면 주행 경로가 중요", source: "guide" },
        { ok: false, text: "이 가격대는 자동비움이 빠지기도 함", source: "guide" },
      ],
    },
    200000
  );

  assert.deepEqual(merged?.map((item) => item.source), [
    "verified",
    "verified",
    "guide",
    "guide",
  ]);
  assert.equal(merged?.[0].text, "예산의 85% 수준");
});

test("항목이 넘쳐도 감수해야 하는 점은 남긴다", () => {
  // 확인된 항목 2개에 좋은 점이 채워지면서 단점이 잘려 나가, 네 카드 모두
  // 장점만 남은 화면이 나갔다. 단점을 먼저 보여주는 것이 이 서비스의
  // 차별점이므로 자리를 먼저 비워 둔다.
  const checks = derivedFitChecks(
    {
      rank: 1,
      name: "무선청소기",
      reason: "",
      searchKeyword: "",
      qualitySummary: "",
      price: 169000,
      isRocket: true,
      fitChecks: [
        { ok: true, text: "30평대 주행 경로에 유리", source: "guide" },
        { ok: true, text: "관리 부담이 적은 구성", source: "guide" },
        { ok: true, text: "설치가 간단한 편", source: "guide" },
        { ok: false, text: "이 가격대는 흡입력이 아쉬움", source: "guide" },
      ],
    },
    200000,
    { cheapestPrice: 59000 }
  );

  const drawbacks = checks?.filter((item) => !item.ok) ?? [];
  assert.equal(drawbacks.length, 1);
  assert.equal(drawbacks[0].text, "이 가격대는 흡입력이 아쉬움");
});

test("지도 결과는 미달 조건도 그대로 표시한다", () => {
  assert.deepEqual(
    placeFitChecks({
      distanceMeters: 2400,
      rating: 3.4,
      reviewCount: 12,
      openNow: false,
    }),
    [
      { ok: false, text: "2.4km — 이동이 필요함", source: "verified" },
      { ok: false, text: "평점 3.4점으로 낮음", source: "verified" },
      { ok: false, text: "후기 12개로 적음", source: "verified" },
      { ok: false, text: "지금은 영업 종료", source: "verified" },
    ]
  );
});

test("확인된 지도 정보가 하나뿐이면 체크리스트를 만들지 않는다", () => {
  assert.equal(placeFitChecks({ rating: 4.5 }), undefined);
  assert.equal(placeFitChecks({}), undefined);
});
