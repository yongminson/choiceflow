import type { QuickRecommendation } from "@/lib/types/analyze";

/**
 * 관점 라벨을 서버 규칙으로 붙인다.
 *
 * 예전에는 AI 가 후보를 지을 때 라벨까지 정하고, 서버는 어긋난 것만
 * 고쳐 주는 방식이었다. 그러다 보니 "가성비 선택"에 35,600원 대신
 * 69,900원이 붙는 화면이 계속 나왔다. AI 는 실행할 때마다 다른 답을
 * 주는데, 라벨은 가격만 알면 정해지는 값이다.
 *
 * 그래서 AI 가 뭐라고 했든 무시하고 여기서 새로 배정한다.
 *   가성비 선택 = 가장 싼 후보
 *   한 단계 위  = 가장 비싼 후보
 *   가장 추천   = 남은 후보 중 종합 적합도가 가장 높은 것
 *   검증 우선   = 마지막 하나
 *
 * 가격을 모르는 후보(검색 실패)는 최저가로도 최고가로도 보지 않는다.
 * 모르는 것을 가장 싸다고 할 수는 없다.
 */

type SelectionType = NonNullable<QuickRecommendation["selectionType"]>;

const SELECTION_TYPES: SelectionType[] = ["best", "value", "reliable", "premium"];

type PricedRecommendation = QuickRecommendation & { price: number };

function hasPrice(item: QuickRecommendation): item is PricedRecommendation {
  return typeof item.price === "number";
}

/**
 * 카테고리별 문구는 후보에 이미 붙어 있으므로 거기서 모아 쓴다.
 * 넷 다 있어야 자리를 바꿔 붙일 수 있다.
 */
function labelsByType(
  items: QuickRecommendation[]
): Map<SelectionType, string> {
  const labels = new Map<SelectionType, string>();
  for (const item of items) {
    if (item.selectionType && item.selectionLabel) {
      labels.set(item.selectionType, item.selectionLabel);
    }
  }
  return labels;
}

export function assignSelectionLabels(
  items: QuickRecommendation[]
): QuickRecommendation[] {
  if (items.length < 2) return items;

  const labels = labelsByType(items);
  if (labels.size < SELECTION_TYPES.length) return items;

  const priced = items.filter(hasPrice);
  if (priced.length < 2) return items;

  const byPrice = [...priced].sort((a, b) => a.price - b.price);
  const assigned = new Map<QuickRecommendation, SelectionType>();

  assigned.set(byPrice[0], "value");
  const priciest = byPrice[byPrice.length - 1];
  if (!assigned.has(priciest)) assigned.set(priciest, "premium");

  /*
    가장 추천은 남은 후보 중 종합 적합도가 가장 높은 것이다.
    종합 적합도는 사용자가 고른 조건으로 이미 계산된 값이므로,
    "고른 조건에 가장 잘 맞는 후보"가 곧 가장 추천이 된다.
  */
  const rest = items.filter((item) => !assigned.has(item));
  const best = rest.reduce<QuickRecommendation | undefined>(
    (top, item) =>
      !top || (item.overall ?? 0) > (top.overall ?? 0) ? item : top,
    undefined
  );
  if (best) assigned.set(best, "best");

  for (const item of items) {
    if (!assigned.has(item)) assigned.set(item, "reliable");
  }

  return items.map((item) => {
    const type = assigned.get(item);
    if (!type) return item;
    return {
      ...item,
      selectionType: type,
      selectionLabel: labels.get(type) ?? item.selectionLabel,
    };
  });
}

/** 후보가 이보다 적어지면 "다른 관점"이라는 말이 무색해진다. */
const MIN_RECOMMENDATIONS = 3;

/**
 * 상품을 못 붙인 후보를 덜어낸다.
 *
 * 검색어가 서로 비슷하면 넷 중 셋이 같은 상품에 걸린다. 이미 쓴 상품을
 * 빼고 나면 남는 것이 없어 그 후보는 가격도 사진도 없이 검색 링크만 달고
 * 선다. 값이 채워진 카드 옆에 그런 카드가 서면 비교가 되지 않는다.
 *
 * 넷을 채우는 것보다 넷이 서로 다른 것이 중요하므로 그런 자리는 뺀다.
 * 다만 쿠팡 조회 자체가 실패한 경우(하나도 못 붙인 경우)는 다르다.
 * 그때는 모두 같은 처지라 덜어낼 것이 없고, 검색 링크라도 있는 편이 낫다.
 */
export function dropUnmatchedWhenOthersMatched(
  items: QuickRecommendation[]
): QuickRecommendation[] {
  const matched = items.filter((item) => typeof item.price === "number");
  if (matched.length === items.length || matched.length === 0) return items;
  if (matched.length < MIN_RECOMMENDATIONS) return items;

  console.warn("[recommend] 겹치는 후보를 빼고 카드 수를 줄입니다.", {
    before: items.length,
    after: matched.length,
  });
  return matched;
}
