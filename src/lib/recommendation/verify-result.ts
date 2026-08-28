import type { CategoryId } from "@/lib/types/category";
import type { QuickRecommendation } from "@/lib/types/analyze";

import { chosenAxisFor } from "./overall-score.ts";
import { findPriceAxis } from "./scores.ts";
import { collectTravelMinutes } from "./travel-time.ts";

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
  context: { categoryId: CategoryId; priorityId: string }
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
    4) "가장 추천"은 최저가·최고가 자리를 뺀 나머지 중 종합 1위여야 한다.
    카드는 라벨 순서로 세우므로 배열 순서와 종합 순위는 다를 수 있다.
    확인할 것은 배열 순서가 아니라 라벨이 제자리에 붙었는지다.
  */
  const best = items.find((item) => item.selectionType === "best");
  const rest = items.filter(
    (item) => item.selectionType !== "value" && item.selectionType !== "premium"
  );
  if (best && rest.length > 1) {
    const top = rest.reduce((max, item) =>
      (item.overall ?? 0) > (max.overall ?? 0) ? item : max
    );
    if (top !== best) {
      violations.push({
        rule: "가장 추천이 나머지 중 종합 1위가 아님",
        detail: { best: best.overall, top: top.overall, topName: top.name },
      });
    }
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

  if (violations.length > 0) {
    console.warn("[recommend] 결과 검증 실패", {
      categoryId: context.categoryId,
      priorityId: context.priorityId,
      violations,
    });
  }
  return violations;
}
