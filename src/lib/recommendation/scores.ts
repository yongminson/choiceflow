import type { QuickRecommendation } from "@/lib/types/analyze";

/**
 * 계산으로 정해지는 점수는 AI 에게 맡기지 않는다.
 *
 * 79,700원짜리가 가격 부담 90점, 35,600원짜리가 70점으로 나갔다.
 * AI 는 실행할 때마다 다른 숫자를 주는데, 가격 대비 부담은 가격만 알면
 * 계산되는 값이다. 계산되는 것을 지어내게 두면 프롬프트를 아무리 고쳐도
 * 같은 어긋남이 다시 나온다.
 *
 * 그래서 가격 축만은 공식으로 덮어쓴다. 값이 싸면 반드시 점수가 높다.
 */

/** 카테고리마다 이름은 다르지만 "가격이 쌀수록 높은 점수"라는 뜻은 같다. */
export const PRICE_AXIS_LABELS = ["가격 부담", "비용 부담", "총비용 유리"];

/**
 * 예산 상한을 다 쓰면 60점, 절반만 쓰면 80점, 상한을 넘기면 그만큼 더 내려간다.
 * 40점 폭만 가격에 배정한 것은, 같은 예산 안의 후보끼리는 가격 차이가
 * 결정적이지 않아서다. 0~100 을 다 쓰면 가격이 다른 모든 축을 눌러버린다.
 */
export function priceBurdenScore(price: number, maxBudgetWon: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(maxBudgetWon) || maxBudgetWon <= 0) {
    return 0;
  }
  const raw = 100 - (price / maxBudgetWon) * 40;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** 후보들이 함께 쓰고 있는 가격 축 이름을 찾는다. */
export function findPriceAxis(items: QuickRecommendation[]): string | undefined {
  return PRICE_AXIS_LABELS.find((label) =>
    items.some((item) => item.scores?.some((score) => score.label === label))
  );
}

/**
 * 가격 축 점수를 공식 값으로 바꾼다.
 *
 * 가격이나 예산을 모르는 후보는 건드리지 않는다. 모르는 값으로 계산한
 * 점수를 옆에 세우면 비교가 성립하지 않는다.
 */
export function applyPriceBurdenScores(
  items: QuickRecommendation[],
  maxBudgetWon?: number
): QuickRecommendation[] {
  if (!maxBudgetWon || maxBudgetWon <= 0) return items;

  const axis = findPriceAxis(items);
  if (!axis) return items;

  const priced = items.filter((item) => typeof item.price === "number");
  if (priced.length !== items.length) return items;

  return items.map((item) => {
    if (typeof item.price !== "number" || !item.scores) return item;
    const computed = priceBurdenScore(item.price, maxBudgetWon);
    return {
      ...item,
      scores: item.scores.map((score) =>
        score.label === axis ? { ...score, value: computed } : score
      ),
    };
  });
}
