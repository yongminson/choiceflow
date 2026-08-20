import type { QuickRecommendation } from "@/lib/types/analyze";

/**
 * 관점 라벨과 가격 점수를 실제 가격에 맞춘다.
 *
 * 라벨은 AI 가 후보를 지을 때 정하는데, 실제 가격은 그 뒤 쿠팡 검색에서
 * 정해진다. 그래서 "가성비 선택"에 69,900원이 걸리고 "한 단계 위"에
 * 21,900원이 걸린 화면이 나갔다. 넷 중 가장 싼 것이 "한 단계 위"였다.
 *
 * 값을 보고 고르라는 화면에서 이건 그냥 틀린 말이다. 가격을 바꿀 수는
 * 없으니 라벨을 사실에 맞춘다. 가장 싼 것에 가성비를, 가장 비싼 것에
 * 한 단계 위를 붙인다. AI 가 1순위로 고른 후보는 그대로 둔다. 그것은
 * 가격이 아니라 조건 전체를 본 판단이라 값과 어긋나도 틀린 말이 아니다.
 */
export function alignLabelsWithPrice(
  items: QuickRecommendation[]
): QuickRecommendation[] {
  const priced = items.filter(hasPrice);
  if (priced.length < 2) return items;

  const labels = labelsByType(items);
  const best = items.find((item) => item.selectionType === "best");

  // 가장 싼 것과 가장 비싼 것을 고르되, AI 1순위와 겹치면 그다음으로 민다.
  const ranked = [...priced].sort((a, b) => a.price - b.price);
  const pool = ranked.filter((item) => item !== best);
  const value = pool[0];
  const premium = pool.length > 1 ? pool[pool.length - 1] : undefined;

  const assigned = new Map<QuickRecommendation, SelectionType>();
  if (best) assigned.set(best, "best");
  if (value) assigned.set(value, "value");
  if (premium && !assigned.has(premium)) assigned.set(premium, "premium");

  /*
    남은 후보에 남은 라벨을 채운다. 검색이 실패해 가격이 없는 후보도
    여기서 자리를 받는다. 가격을 모르는 것을 최저가라고 할 수는 없다.
  */
  const taken = new Set<SelectionType>();
  assigned.forEach((type) => taken.add(type));
  const remainingTypes = SELECTION_TYPES.filter((type) => !taken.has(type));
  for (const item of items) {
    if (assigned.has(item)) continue;
    const type = remainingTypes.shift();
    if (type) assigned.set(item, type);
  }

  warnIfMisordered(items, ranked);

  const relabelled = items.map((item) => {
    const type = assigned.get(item);
    if (!type || type === item.selectionType) return item;
    return {
      ...item,
      selectionType: type,
      // 화면에 뜨는 문구는 후보를 만들 때 이미 붙어 있다. 함께 옮기지 않으면
      // 순서만 바뀌고 문구는 그대로 남아 어긋난다.
      selectionLabel: labels.get(type) ?? item.selectionLabel,
    };
  });

  return alignPriceScores(relabelled);
}

type SelectionType = NonNullable<QuickRecommendation["selectionType"]>;

const SELECTION_TYPES: SelectionType[] = [
  "best",
  "value",
  "reliable",
  "premium",
];

/** 가격이 낮을수록 높은 점수를 주는 축. 카테고리마다 이름이 다르다. */
const PRICE_AXIS_LABELS = ["가격 부담", "비용 부담", "총비용 유리"];

type PricedRecommendation = QuickRecommendation & { price: number };

function hasPrice(item: QuickRecommendation): item is PricedRecommendation {
  return typeof item.price === "number";
}

/** 카테고리별 문구는 후보에 이미 붙어 있으므로 거기서 모아 쓴다. */
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

/**
 * 가격 점수를 실제 가격 순서에 맞춘다.
 *
 * 69,900원짜리가 가격 부담 100점, 21,900원짜리가 70점으로 나갔다.
 * 점수는 AI 가 매기는데 실제 가격은 그 뒤에 정해지니 뒤집힐 수밖에 없다.
 * 점수 자체는 AI 가 벌려 놓은 간격을 그대로 쓰고, 어느 후보에 붙일지만
 * 가격 순서대로 다시 나눠 준다. 간격은 판단이고 순서는 사실이다.
 */
function alignPriceScores(
  items: QuickRecommendation[]
): QuickRecommendation[] {
  const ranked = items.filter(hasPrice).sort((a, b) => a.price - b.price);
  if (ranked.length < 2) return items;

  const axis = PRICE_AXIS_LABELS.find((label) =>
    ranked.every((item) => item.scores?.some((score) => score.label === label))
  );
  if (!axis) return items;

  const scoreOf = (item: QuickRecommendation) =>
    item.scores?.find((score) => score.label === axis)?.value;
  const values = ranked
    .map(scoreOf)
    .filter((value): value is number => typeof value === "number");
  if (values.length !== ranked.length) return items;

  // 비싼 쪽이 더 높은 점수를 받고 있으면 뒤집힌 것이다.
  const ordered = [...values].sort((a, b) => b - a);
  if (ordered.every((value, index) => value === values[index])) return items;

  console.warn("[recommend] 가격 점수가 실제 가격과 어긋나 다시 매깁니다.", {
    axis,
    prices: ranked.map((item) => item.price),
    before: values,
    after: ordered,
  });

  const corrected = new Map<QuickRecommendation, number>();
  ranked.forEach((item, index) => corrected.set(item, ordered[index]));

  return items.map((item) => {
    const value = corrected.get(item);
    if (value === undefined || !item.scores) return item;
    return {
      ...item,
      scores: item.scores.map((score) =>
        score.label === axis ? { ...score, value } : score
      ),
    };
  });
}

function warnIfMisordered(
  items: QuickRecommendation[],
  ranked: PricedRecommendation[]
): void {
  const valueItem = items.find((item) => item.selectionType === "value");
  const premiumItem = items.find((item) => item.selectionType === "premium");
  const cheapest = ranked[0];
  const priciest = ranked[ranked.length - 1];

  if (valueItem && hasPrice(valueItem) && valueItem.price > cheapest.price) {
    console.warn("[recommend] 가성비 라벨이 최저가 후보가 아닙니다.", {
      labelled: valueItem.price,
      cheapest: cheapest.price,
    });
  }
  if (premiumItem && hasPrice(premiumItem) && premiumItem.price < priciest.price) {
    console.warn("[recommend] 한 단계 위 라벨이 최고가 후보가 아닙니다.", {
      labelled: premiumItem.price,
      priciest: priciest.price,
    });
  }
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

