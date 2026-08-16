import type { QuickRecommendation } from "@/lib/types/analyze";

/** 이보다 적게 벌어진 차이는 라벨을 흔들 만한 차이로 보지 않는다. */
const VALUE_LABEL_TOLERANCE = 0.05;

/**
 * "가성비 선택"이 후보 중 가장 싼 것에 붙도록 맞춘다.
 *
 * 라벨은 AI 가 후보를 지을 때 정하는데, 실제 가격은 그 뒤 쿠팡 검색에서
 * 정해진다. 그래서 "가성비 선택"이 241,400원인데 아래 후보가 190,000원인
 * 화면이 나갔다. 값을 보고 고르라는 화면에서 이건 그냥 틀린 말이다.
 *
 * 가격을 바꿀 수는 없으니 라벨을 사실에 맞춘다. 가성비 라벨과 최저가 후보의
 * 라벨을 맞바꾼다. 근소한 차이로 라벨이 계속 뒤집히지 않게 여유를 둔다.
 */
export function alignValueLabelWithPrice(
  items: QuickRecommendation[]
): QuickRecommendation[] {
  const priced = items.filter(
    (item): item is QuickRecommendation & { price: number } =>
      typeof item.price === "number"
  );
  if (priced.length < 2) return items;

  const valueItem = priced.find((item) => item.selectionType === "value");
  if (!valueItem) return items;

  const cheapestItem = priced.reduce((min, item) =>
    item.price < min.price ? item : min
  );
  if (cheapestItem === valueItem) return items;
  if (cheapestItem.price > valueItem.price * (1 - VALUE_LABEL_TOLERANCE)) {
    return items;
  }

  /*
    화면에 뜨는 문구(selectionLabel)는 후보를 만들 때 이미 정해져 붙어 있다.
    selectionType 만 바꾸면 순서만 바뀌고 문구는 그대로 남아 어긋난다.
    둘은 같은 카테고리의 후보라 문구를 그대로 맞바꾸면 된다.
  */
  const fromValue = {
    selectionType: valueItem.selectionType,
    selectionLabel: valueItem.selectionLabel,
  };
  const fromCheapest = {
    selectionType: cheapestItem.selectionType,
    selectionLabel: cheapestItem.selectionLabel,
  };

  return items.map((item) => {
    if (item === valueItem) return { ...item, ...fromCheapest };
    if (item === cheapestItem) return { ...item, ...fromValue };
    return item;
  });
}
