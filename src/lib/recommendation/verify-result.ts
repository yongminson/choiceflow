import type { CategoryId } from "@/lib/types/category";
import type { QuickRecommendation } from "@/lib/types/analyze";

import {
  chosenAxisFor,
  overallWeights,
  weightedOverall,
} from "./overall-score.ts";
import { findPriceAxis, priceBurdenScore } from "./scores.ts";
import { collectTravelMinutes } from "./travel-time.ts";
import { isWrongAudience, type DetectedAudience } from "./gender.ts";
import { matchesTargetItem, type TargetItem } from "./item-match.ts";
import { productBrandKey } from "../monetization/brand-verify.ts";
import { isWrongOccasion, type Occasion } from "./occasion.ts";
import { isWrongCaution } from "./caution-match.ts";
import { isWrongCleaning, type CleaningNeed } from "./cleaning-match.ts";
import { looksLikeAccessory } from "./accessory-match.ts";

/**
 * 화면에 내보내기 직전에 규칙을 어긴 곳이 없는지 본다.
 *
 * 값을 서버가 계산하도록 바꿔도, 나중에 누가 순서를 한 줄 바꾸면 규칙이
 * 조용히 깨진다. 실제로 라벨과 가격이 뒤집힌 화면이 여러 번 나갔는데
 * 배포 전에는 아무도 몰랐다. 그래서 계산이 끝난 결과를 마지막에 한 번 더
 * 훑는다.
 *
 * 여기서 값을 고치지는 않는다. 고치는 일은 앞 단계가 하고, 이 함수는
 * 앞 단계가 제 일을 했는지만 본다. 어긴 것이 있으면 로그로 남겨
 * 어떤 규칙이 언제 깨졌는지 배포 뒤에도 찾을 수 있게 한다.
 */

export type Violation = { rule: string; detail: Record<string, unknown> };

export function verifyRecommendations(
  items: QuickRecommendation[],
  context: {
    categoryId: CategoryId;
    priorityId: string;
    audience?: DetectedAudience;
    targetItem?: TargetItem;
    maxBudgetWon?: number;
    occasion?: Occasion;
    cleaning?: CleaningNeed;
  }
): Violation[] {
  const violations: Violation[] = [];
  if (items.length < 2) return violations;

  const priced = items.filter(
    (item): item is QuickRecommendation & { price: number } =>
      typeof item.price === "number"
  );

  // 1) 가성비 선택이 한 단계 위보다 비싸면 안 된다.
  const value = items.find((item) => item.selectionType === "value");
  const premium = items.find((item) => item.selectionType === "premium");
  if (
    value?.price !== undefined &&
    premium?.price !== undefined &&
    value.price > premium.price
  ) {
    violations.push({
      rule: "가성비 선택이 한 단계 위보다 비쌈",
      detail: { value: value.price, premium: premium.price },
    });
  }

  /*
    1-1) "가성비 선택"은 최저가 후보에만 붙는다.

    후보가 넷에서 셋으로 줄었을 때 배정이 통째로 건너뛰어져 최고가에
    가성비 라벨이 붙어 나갔다. 1) 은 가성비와 한 단계 위를 견주는데,
    한 단계 위가 없는 화면에서는 아무것도 걸리지 않았다.
    개수와 무관하게 최저가인지만 본다.
  */
  if (value?.price !== undefined && priced.length >= 2) {
    /*
      최저가가 종합 1위라 이미 "가장 추천"이 된 때가 있다. 그때는 가성비가
      두 번째로 싼 것이 되는 것이 맞으므로 가장 추천을 빼고 견준다.
      그 카드에는 "후보 중 가장 저렴함" 표시가 따로 붙어 값이 가려지지 않는다.
    */
    const others = priced.filter((item) => item.selectionType !== "best");
    const pool = others.length > 0 ? others : priced;
    const lowest = Math.min(...pool.map((item) => item.price));
    if (value.price > lowest) {
      violations.push({
        rule: "가성비 선택이 최저가가 아님",
        detail: {
          name: value.name,
          price: value.price,
          lowest,
          total: items.length,
        },
      });
    }
  }

  /*
    1-2) 한 카드 안에서 라벨과 배지가 서로 반대말을 하면 안 된다.

    "가성비 선택" 아래에 "후보 중 가장 비쌈"이 붙은 화면이 실제로
    나갔다. 둘 다 서버가 붙인 것이라 어느 쪽이 틀렸는지는 화면만 봐서는
    알 수 없다. 규칙으로 박아 두면 다음에 어긋날 때 바로 드러난다.
  */
  const contradicting = items.filter(
    (item) =>
      item.selectionType === "value" &&
      (item.fitChecks ?? []).some((check) => check.text.includes("가장 비쌈"))
  );
  if (contradicting.length > 0) {
    violations.push({
      rule: "가성비 선택에 가장 비쌈 표시가 함께 붙음",
      detail: { products: contradicting.map((item) => item.name) },
    });
  }

  /*
    1-3) 후보 수에 따라 쓰는 자리가 정해져 있다.
    셋 이하에서 "한 단계 위"가 나오면 배정 규칙이 어긋난 것이다.
  */
  if (items.length < 4 && items.some((item) => item.selectionType === "premium")) {
    violations.push({
      rule: "후보가 넷 미만인데 한 단계 위가 쓰임",
      detail: {
        total: items.length,
        types: items.map((item) => item.selectionType),
      },
    });
  }

  /*
    1-4) 같은 자리가 두 번 나오면 안 된다.
    배정이 건너뛰어지면 AI 가 붙인 라벨이 그대로 남아 겹칠 수 있다.
  */
  const typeCounts = new Map<string, number>();
  for (const item of items) {
    if (!item.selectionType) continue;
    typeCounts.set(
      item.selectionType,
      (typeCounts.get(item.selectionType) ?? 0) + 1
    );
  }
  typeCounts.forEach((count, type) => {
    if (count > 1) {
      violations.push({
        rule: "같은 관점 라벨이 여러 후보에 붙음",
        detail: { type, count },
      });
    }
  });

  /*
    1-5) 맨 위 카드는 종합 적합도 1위여야 한다.

    화면은 첫 후보를 히어로로 크게 세우고 "AI 추천 1위"라고 적는다.
    그 아래 그래프는 종합 적합도 순으로 다시 세운다. 둘이 어긋나면
    같은 화면에서 "1위"와 "3위"가 같은 제품을 가리키게 된다.
    실제로 82점짜리가 히어로에 서고 94점짜리가 그래프 1위로 나갔다.
  */
  const scoredItems = items.filter((item) => typeof item.overall === "number");
  if (scoredItems.length === items.length && items.length >= 2) {
    const highest = Math.max(...items.map((item) => item.overall as number));
    if ((items[0].overall as number) !== highest) {
      violations.push({
        rule: "맨 위 카드가 종합 적합도 1위가 아님",
        detail: {
          heroName: items[0].name,
          heroOverall: items[0].overall,
          highest,
          topName: items.find((item) => item.overall === highest)?.name,
        },
      });
    }
  }

  // 2) 가격이 오를수록 가격 축 점수는 내려가야 한다.
  const priceAxis = findPriceAxis(items);
  if (priceAxis && priced.length >= 2) {
    const byPrice = [...priced].sort((a, b) => a.price - b.price);
    const scores = byPrice.map(
      (item) => item.scores?.find((score) => score.label === priceAxis)?.value
    );
    const inverted = scores.some(
      (score, index) =>
        index > 0 &&
        typeof score === "number" &&
        typeof scores[index - 1] === "number" &&
        score > (scores[index - 1] as number)
    );
    if (inverted) {
      violations.push({
        rule: "가격이 비싼 후보의 가격 점수가 더 높음",
        detail: {
          axis: priceAxis,
          prices: byPrice.map((item) => item.price),
          scores,
        },
      });
    }
  }

  // 3) 고른 조건의 세부 점수 1위가 종합 1위여야 한다.
  const chosenAxis = chosenAxisFor(context.categoryId, context.priorityId);
  if (chosenAxis) {
    const scoreOf = (item: QuickRecommendation) =>
      item.scores?.find((score) => score.label === chosenAxis)?.value;
    const withAxis = items.filter((item) => typeof scoreOf(item) === "number");
    if (withAxis.length === items.length && items.length >= 2) {
      const axisTop = Math.max(...withAxis.map((item) => scoreOf(item) as number));
      const overallTop = items.reduce((top, item) =>
        (item.overall ?? 0) > (top.overall ?? 0) ? item : top
      );
      if ((scoreOf(overallTop) as number) !== axisTop) {
        /*
          가중치가 0.5 라 고른 축 1등이 항상 종합 1등이 되지는 않는다.
          다른 축에서 크게 뒤지면 뒤집힐 수 있고 그것이 틀린 것은 아니다.
          다만 자주 벌어지면 가중치를 다시 봐야 하므로 남겨 둔다.
        */
        violations.push({
          rule: "고른 조건 1위와 종합 1위가 다름",
          detail: {
            axis: chosenAxis,
            axisTop,
            overallTopAxisScore: scoreOf(overallTop),
            overallTopName: overallTop.name,
          },
        });
      }
    }
  }

  /*
    4) "가장 추천"은 후보 전체의 종합 1위여야 한다.

    전에는 최저가·최고가를 뺀 나머지 중 1위였다. 그래서 최고가가 종합
    1위면 그 자리를 얻지 못했고, 맨 위 카드와 딱지가 서로 다른 후보를
    가리켰다. 화면이 "1위"라고 적는 자리와 같아야 한다.
  */
  const bestItem = items.find((item) => item.selectionType === "best");
  if (bestItem && items.length >= 2) {
    const top = items.reduce((max, item) =>
      (item.overall ?? 0) > (max.overall ?? 0) ? item : max
    );
    if ((bestItem.overall ?? 0) !== (top.overall ?? 0)) {
      violations.push({
        rule: "가장 추천이 종합 1위가 아님",
        detail: { best: bestItem.overall, top: top.overall, topName: top.name },
      });
    }
  }

  /*
    4-1) 감수할 점이 실제로 붙은 상품 이야기여야 한다.
    전기요 카드에 "동절기 물 빠짐이 번거롭다"는 온수매트 단점이
    붙어 나갔다. 단점은 이 화면의 성격 자체라 틀린 채로 두면 안 된다.
  */
  const offCaution = items.filter((item) =>
    isWrongCaution(item.caution, item.productName)
  );
  if (offCaution.length > 0) {
    violations.push({
      rule: "상품과 맞지 않는 단점이 붙음",
      detail: {
        items: offCaution.map((item) => ({
          productName: item.productName,
          caution: item.caution,
        })),
      },
    });
  }

  /*
    4-2) 청소기는 무엇을 닦는 물건인지까지 맞아야 한다.
    "바닥 물걸레 청소기"를 찾았는데 유리창 청소 로봇이 종합 1위로
    올라갔다. 상품명에 "청소기"가 들어가 품목 필터를 통과한 탓이다.
  */
  if (context.cleaning) {
    const offCleaning = items.filter(
      (item) =>
        item.productName &&
        isWrongCleaning(item.productName, context.cleaning)
    );
    if (offCleaning.length > 0) {
      violations.push({
        rule: "청소 대상이 요청과 다른 상품이 섞임",
        detail: {
          surface: context.cleaning.surface,
          method: context.cleaning.method,
          products: offCleaning.map((item) => item.productName),
        },
      });
    }
  }

  /*
    4-3) 본체 자리에 부속품이 서면 안 된다.
    로봇청소기를 바꾸겠다는 요청에 호환 물걸레 패드가 11,990원으로
    후보에 올랐다. 설명은 본체 이야기 그대로라 값싼 상품에
    "브랜드 프리미엄으로 가격이 높다"는 단점이 붙었다.
  */
  const accessories = items.filter(
    (item) => item.productName && looksLikeAccessory(item.productName)
  );
  if (accessories.length > 0) {
    violations.push({
      rule: "본체가 아닌 부속품이 후보에 있음",
      detail: {
        products: accessories.map((item) => ({
          productName: item.productName,
          price: item.price,
        })),
      },
    });
  }

  // 5) 같은 상품이 두 자리를 차지하면 안 된다.
  const seen = new Set<string>();
  for (const item of items) {
    const key = item.productName || item.sourceUrl;
    if (!key) continue;
    if (seen.has(key)) {
      violations.push({ rule: "같은 상품이 여러 자리에 있음", detail: { key } });
      break;
    }
    seen.add(key);
  }

  // 6) 한 후보 안에서 같은 수치가 서로 달라서는 안 된다.
  for (const item of items) {
    const minutes = collectTravelMinutes([
      item.reason,
      item.qualitySummary,
      item.caution,
      ...(item.fitChecks ?? []).map((check) => check.text),
    ].filter((text): text is string => typeof text === "string"));
    const distinct = Array.from(new Set(minutes));
    if (distinct.length > 1) {
      violations.push({
        rule: "한 후보의 소요 시간이 여러 값으로 적힘",
        detail: { name: item.name, minutes: distinct },
      });
    }
  }

  /*
    7) 요청한 대상과 다른 상품이 섞이면 안 된다.
    "여성 니트"를 찾았는데 후보 넷이 전부 아동복으로 나간 적이 있다.
    옷은 대상이 어긋나면 그 추천 자체가 못 쓰는 것이 된다.
  */
  if (context.audience) {
    const mismatched = items.filter(
      (item) =>
        item.productName &&
        isWrongAudience(item.productName, context.audience as DetectedAudience)
    );
    if (mismatched.length > 0) {
      violations.push({
        rule: "요청한 대상과 다른 상품이 섞임",
        detail: {
          audience: context.audience.term,
          ageGroup: context.audience.ageGroup,
          products: mismatched.map((item) => item.productName),
        },
      });
    }
  }

  /*
    8) 요청한 품목과 다른 상품이 섞이면 안 된다.
    "가을 니트"를 찾았는데 팔토시와 정장 바지가 후보에 들어왔고,
    그중 바지가 종합 1위로 올라간 적이 있다. 개수보다 관련성이 먼저다.
  */
  if (context.targetItem) {
    const offItem = items.filter(
      (item) =>
        item.productName &&
        !matchesTargetItem(item.productName, context.targetItem)
    );
    if (offItem.length > 0) {
      violations.push({
        rule: "요청한 품목과 다른 상품이 섞임",
        detail: {
          targetItem: context.targetItem.name,
          products: offItem.map((item) => item.productName),
        },
      });
    }
  }

  /*
    9) 화면에 나가는 숫자가 계산값과 같아야 한다.

    앞 단계가 계산해 넣은 값을 뒤에서 누가 덮어써도 화면만 보고는 알 수
    없다. 스크린샷을 손으로 대조하는 것 말고는 확인할 방법이 없었다.
    그래서 내보내기 직전에 같은 식으로 다시 계산해 맞춰 본다.
  */
  const weights = overallWeights(items, context.categoryId, context.priorityId);
  if (weights) {
    const drifted = items
      .filter((item) => typeof item.overall === "number")
      .map((item) => ({
        name: item.name,
        shown: item.overall,
        expected: weightedOverall(item, weights),
      }))
      .filter((entry) => entry.shown !== entry.expected);
    if (drifted.length > 0) {
      violations.push({
        rule: "화면의 종합 적합도가 세부 점수 계산값과 다름",
        detail: { drifted },
      });
    }
  }

  // 10) 가격 점수도 공식으로 다시 계산해 맞춰 본다.
  if (priceAxis && context.maxBudgetWon) {
    const drifted = priced
      .map((item) => ({
        name: item.name,
        price: item.price,
        shown: item.scores?.find((score) => score.label === priceAxis)?.value,
        expected: priceBurdenScore(item.price, context.maxBudgetWon as number),
      }))
      .filter(
        (entry) => typeof entry.shown === "number" && entry.shown !== entry.expected
      );
    if (drifted.length > 0) {
      violations.push({
        rule: "화면의 가격 점수가 공식값과 다름",
        detail: { axis: priceAxis, drifted },
      });
    }
  }

  /*
    11) 한 브랜드가 화면을 다 차지하면 안 된다.
    밥솥 후보 넷이 전부 쿠첸으로 채워진 적이 있다. 제휴 고지가 붙는
    화면에서 한 브랜드만 늘어서면 추천이 아니라 홍보로 읽힌다.
  */
  const brandCounts = new Map<string, number>();
  for (const item of items) {
    if (!item.productName) continue;
    const brand = productBrandKey(item.productName);
    if (!brand) continue;
    brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
  }
  brandCounts.forEach((count, brand) => {
    if (count >= 3) {
      violations.push({
        rule: "같은 브랜드가 후보 대부분을 차지함",
        detail: { brand, count, total: items.length },
      });
    }
  });

  /*
    12) 계절과 자리가 어긋나는 상품이 섞이면 안 된다.
    추석 시댁 모임에 입을 옷을 찾았는데 "여름여행 플라워 투피스"가
    후보에 올라온 적이 있다. 상품명에 여름이라고 적혀 있었다.
  */
  if (context.occasion) {
    const offSeason = items.filter(
      (item) =>
        item.productName &&
        isWrongOccasion(item.productName, context.occasion as Occasion)
    );
    if (offSeason.length > 0) {
      violations.push({
        rule: "계절이나 자리에 맞지 않는 상품이 섞임",
        detail: {
          season: context.occasion.season,
          formal: context.occasion.formal,
          products: offSeason.map((item) => item.productName),
        },
      });
    }
  }

  if (violations.length > 0) {
    console.warn("[recommend] 결과 검증 실패", {
      categoryId: context.categoryId,
      priorityId: context.priorityId,
      violations,
    });
  }
  return violations;
}
