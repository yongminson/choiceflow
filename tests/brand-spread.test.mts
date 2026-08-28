import { strict as assert } from "node:assert";
import test from "node:test";

import { productBrandKey } from "../src/lib/monetization/brand-verify.ts";
import { verifyRecommendations } from "../src/lib/recommendation/verify-result.ts";
import type { QuickRecommendation } from "../src/lib/types/analyze.ts";

function pot(name: string, price: number): QuickRecommendation {
  return {
    rank: 1,
    name,
    reason: "",
    searchKeyword: "",
    qualitySummary: "",
    productName: name,
    price,
  };
}

test("아는 브랜드는 별칭까지 같은 것으로 본다", () => {
  // 실제로 후보 넷을 모두 채웠던 브랜드다.
  assert.equal(productBrandKey("쿠첸 2.1기압 121 IH 전기압력밥솥 10인용"), "쿠첸");
  assert.equal(productBrandKey("CUCHEN 브레인 풀스테인리스"), "쿠첸");
  assert.equal(productBrandKey("쿠쿠 트윈프레셔 6인용"), "쿠쿠");
});

test("모르는 브랜드는 상품명 첫 낱말로 본다", () => {
  assert.equal(productBrandKey("여누키즈 리본 니트 가디건"), "여누키즈");
  assert.equal(productBrandKey("[특가] 무이담 여성용 라운드넥 니트"), "무이담");
  // 같은 브랜드면 뒤가 달라도 같은 열쇠가 나온다.
  assert.equal(
    productBrandKey("무이담 여성용 반팔 티셔츠"),
    productBrandKey("무이담 여성용 라운드넥 니트")
  );
});

test("같은 브랜드가 셋 이상이면 잡는다", () => {
  const rules = verifyRecommendations(
    [
      pot("쿠첸 2.1기압 121 IH 전기압력밥솥 10인용", 302480),
      pot("쿠첸 전기압력밥솥 10인용", 176500),
      pot("쿠첸 브레인 풀스테인리스 듀얼프레셔", 274890),
      pot("쿠첸 121 플러스 올스테인리스 전기압력밥솥", 309000),
    ],
    { categoryId: "appliance", priorityId: "performance" }
  ).map((item) => item.rule);
  assert.ok(rules.includes("같은 브랜드가 후보 대부분을 차지함"));
});

test("같은 브랜드가 둘까지는 통과한다", () => {
  const rules = verifyRecommendations(
    [
      pot("쿠첸 2.1기압 121 IH 전기압력밥솥 10인용", 302480),
      pot("쿠첸 전기압력밥솥 10인용", 176500),
      pot("쿠쿠 트윈프레셔 10인용", 274890),
      pot("리홈 스마트 전기압력밥솥 10인용", 309000),
    ],
    { categoryId: "appliance", priorityId: "performance" }
  ).map((item) => item.rule);
  assert.ok(!rules.includes("같은 브랜드가 후보 대부분을 차지함"));
});
