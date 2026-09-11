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
 *   가장 추천   = 종합 적합도 1위
 *   한 단계 위  = 남은 것 중 가장 비싼 후보 (후보가 넷 이상일 때만)
 *   가성비 선택 = 남은 것 중 가장 싼 후보
 *   검증 우선   = 마지막 하나
 *
 * 가격을 모르는 후보(검색 실패)는 최저가로도 최고가로도 보지 않는다.
 * 모르는 것을 가장 싸다고 할 수는 없다.
 *
 * 개수에 따라 쓰는 라벨이 달라진다.
 *   넷 이상 — 가장 추천 / 가성비 선택 / 검증 우선 / 한 단계 위
 *   셋     — 가장 추천 / 가성비 선택 / 검증 우선
 *   둘     — 가장 추천 / 가성비 선택
 *
 * 후보가 셋일 때 최고가를 "한 단계 위"로 빼면 남는 자리가 하나뿐이라
 * 가성비와 검증 우선 중 하나가 사라진다. 결론을 하나 보여주는 것이
 * 이 화면의 역할이므로 없어질 자리는 한 단계 위 쪽이다.
 *
 * 가성비 선택은 가장 추천을 뺀 나머지 중 최저가에만 붙는다. 최저가가
 * 종합 1위라 이미 가장 추천이 된 때 말고는 후보 전체의 최저가와 같다.
 * 이것이 깨지면 같은 카드에 "가성비 선택"과 "후보 중 가장 비쌈"이
 * 나란히 붙는다.
 */

type SelectionType = NonNullable<QuickRecommendation["selectionType"]>;

type PricedRecommendation = QuickRecommendation & { price: number };

function hasPrice(item: QuickRecommendation): item is PricedRecommendation {
  return typeof item.price === "number";
}

/**
 * 후보에 이미 붙어 있는 문구를 모은다.
 *
 * 예전에는 이것만 썼다. 네 자리가 다 있어야 바꿔 붙일 수 있으니
 * 넷이 안 모이면 아예 손을 떼게 해 두었는데, 후보가 셋으로 줄자
 * 그 조건이 영영 참이 되지 않아 배정이 통째로 건너뛰어졌다.
 * AI 가 붙인 라벨이 그대로 나가 최고가에 "가성비 선택"이 붙었다.
 *
 * 그래서 문구는 호출하는 쪽에서 받는 것을 우선으로 하고, 여기서 모으는
 * 것은 그때 쓸 수 없을 때를 위한 대비로만 남긴다.
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

/** 한 단계 위 자리를 쓰려면 후보가 이만큼은 있어야 한다. */
const PREMIUM_MIN_ITEMS = 4;

export function assignSelectionLabels(
  items: QuickRecommendation[],
  /**
   * 자리별 문구를 돌려준다. 카테고리마다 문구가 다르므로 값을 아는
   * 쪽에서 넘긴다. 넘기지 않으면 후보에 붙어 있던 문구를 쓴다.
   */
  labelFor?: (type: SelectionType) => string | undefined
): QuickRecommendation[] {
  if (items.length < 2) return items;

  const harvested = labelsByType(items);
  const resolveLabel = (type: SelectionType) =>
    labelFor?.(type) ?? harvested.get(type);

  const priced = items.filter(hasPrice);
  if (priced.length < 2) return items;

  const byPrice = [...priced].sort((a, b) => a.price - b.price);
  const assigned = new Map<QuickRecommendation, SelectionType>();

  /*
    가장 추천을 먼저 정한다. 종합 적합도 1위다.

    전에는 최저가·최고가를 뺀 나머지 중 1위였다. 그래서 최고가가 종합
    1위면 그 자리를 얻지 못했고, 맨 위에 선 카드(종합 1위)와 "가장 추천"
    딱지가 서로 다른 후보에 붙었다. 화면은 종합 적합도 순으로 세우므로
    맨 앞 카드가 "한 단계 위"로 나오는 일이 생겼다.

    종합 적합도 1위가 곧 가장 추천이다. 그래야 맨 위 카드와 딱지가
    언제나 같은 것을 가리킨다.
  */
  const best = items.reduce((top, item) =>
    (item.overall ?? 0) > (top.overall ?? 0) ? item : top
  );
  assigned.set(best, "best");

  /*
    한 단계 위는 후보가 넷 이상일 때만 쓴다. 셋에서 최고가를 여기로
    빼면 가성비나 검증 우선 중 하나가 자리를 잃는다.
  */
  if (items.length >= PREMIUM_MIN_ITEMS) {
    const priciest = [...byPrice]
      .reverse()
      .find((item) => !assigned.has(item));
    if (priciest) assigned.set(priciest, "premium");
  }

  /*
    가성비는 남은 것 중 가장 싼 후보다.

    보통은 후보 전체의 최저가와 같다. 최저가가 종합 1위라서 이미 가장
    추천이 된 때만 두 번째로 싼 것이 된다. 그때는 그 카드에 "후보 중
    가장 저렴함" 표시가 따로 붙으므로 값이 가려지지 않는다.
  */
  const cheapestLeft = byPrice.find((item) => !assigned.has(item));
  const priciest = byPrice[byPrice.length - 1];
  const pricesDiffer = byPrice[0].price !== priciest.price;
  /*
    남은 것이 후보 중 최고가뿐이면 가성비 자리를 비운다. 후보가 둘인데
    싼 쪽이 종합 1위라 가장 추천이 되면 비싼 쪽만 남는데, 거기에 가성비를
    붙이면 같은 카드에 "가성비 선택"과 "후보 중 가장 비쌈"이 나란히 선다.
    붙일 것이 없으면 검증 우선으로 둔다.
  */
  if (cheapestLeft && !(pricesDiffer && cheapestLeft === priciest)) {
    assigned.set(cheapestLeft, "value");
  }

  /*
    남은 자리는 검증 우선이다.

    자리가 넷뿐이라 후보가 다섯 이상이면 검증 우선이 여러 장 생긴다.
    지금 파이프라인은 넷을 만들고 화면도 넷에서 자르므로 그런 일은
    없지만, 개수가 늘면 조용히 겹친다. 이번에 넷에서 셋으로 줄었을 때
    배정이 통째로 건너뛰어진 것도 개수가 바뀐 것을 아무도 몰랐기
    때문이다. 검증 함수에 "같은 라벨이 여러 후보에 붙음"을 넣어 두어
    다음에 개수가 바뀌면 로그로 바로 드러나게 했다.
  */
  for (const item of items) {
    if (!assigned.has(item)) assigned.set(item, "reliable");
  }

  return items.map((item) => {
    const type = assigned.get(item);
    if (!type) return item;
    return {
      ...item,
      selectionType: type,
      selectionLabel: resolveLabel(type) ?? item.selectionLabel,
    };
  });
}

/**
 * 후보가 이보다 적어지면 비교할 것이 없다.
 *
 * 셋으로 두었더니 요청과 무관한 상품으로 넷째 자리를 채우는 편이
 * 나은 것처럼 보였다. 개수보다 관련성이 먼저다. 니트를 찾는 사람에게
 * 바지를 하나 끼워 넣느니 둘만 보여주는 것이 낫다.
 */
const MIN_RECOMMENDATIONS = 2;

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
