import type { CategoryId } from "@/lib/types/category";
import type { QuickRecommendation } from "@/lib/types/analyze";

/**
 * 종합 적합도를 세부 점수에서 직접 계산한다.
 *
 * "동선 우선"을 고른 요청에서 이동 편의 3등짜리가 종합 1위로 올라왔다.
 * 종합 점수를 AI 가 통째로 지어내다 보니 2번 질문에서 고른 조건과 아무
 * 상관이 없었다. 고른 조건을 우선한다고 해 놓고 순위가 그것을 따르지
 * 않으면 질문 자체가 무의미해진다.
 *
 * 세부 점수는 AI 의 판단이고, 그것을 어떻게 합칠지는 사용자가 고른 조건이
 * 정한다. 합치는 일은 계산이므로 서버가 한다.
 */

/**
 * 고른 조건에 해당하는 축에 주는 비중. 나머지가 남은 비중을 나눠 갖는다.
 *
 * 0.5 로 두었더니 고른 축에서 앞선 후보가 다른 축에 밀려 뒤로 가는 일이
 * 계속 나왔다. "동선 우선"이라고 골랐는데 이동 편의 1등이 종합 3위로
 * 밀리면 질문이 무의미해진다. 고른 조건이 사실상 순위를 정하도록 올린다.
 * 나머지 축은 비슷할 때 갈라 주는 역할만 한다.
 */
export const CHOSEN_WEIGHT = 0.8;

/**
 * 2번 질문의 선택지가 어느 세부 축에 해당하는지.
 *
 * 빠진 자리가 있으면 그 조건을 고른 사람에게는 가중치가 걸리지 않고
 * 모든 축이 같아진다. 실제로 선물 분야에 "디자인"이 비어 있어서,
 * 디자인을 고른 요청이 세 축의 단순 평균으로 나갔다. 고른 조건을
 * 우선한다고 해 놓고 아무 데도 반영되지 않은 셈이다.
 *
 * 그래서 네 선택지를 모두 채운다. 딱 맞는 축이 없으면 뜻이 가장 가까운
 * 축에 건다. "디자인"은 결국 그 선택이 얼마나 마음에 드느냐의 문제라
 * 만족도 쪽 축으로 보낸다.
 */
const PRIORITY_AXIS: Record<CategoryId, Record<string, string>> = {
  food: {
    price: "가격 부담",
    performance: "맛 만족도",
    design: "맛 만족도",
    convenience: "접근성",
  },
  gift: {
    price: "가격 부담",
    performance: "받는 사람 만족",
    design: "받는 사람 만족",
    convenience: "실패 위험 낮음",
  },
  appliance: {
    price: "가격 부담",
    performance: "성능",
    design: "성능",
    convenience: "관리 편의",
  },
  fashion: {
    price: "가격 부담",
    performance: "활용도",
    design: "활용도",
    convenience: "관리 편의",
  },
  date: {
    price: "비용 부담",
    performance: "경험 만족",
    design: "경험 만족",
    convenience: "이동 편의",
  },
  asset: {
    price: "총비용 유리",
    performance: "안정성",
    design: "환금성",
    convenience: "계약 유연성",
  },
};

/** 사용자가 고른 조건이 어느 세부 축을 가리키는지. 짝이 없으면 undefined. */
export function chosenAxisFor(
  categoryId: CategoryId,
  priorityId: string
): string | undefined {
  return PRIORITY_AXIS[categoryId]?.[priorityId];
}

/**
 * 세부 점수를 고른 조건에 맞춰 합치고, 그 값으로 후보 순서를 다시 매긴다.
 *
 * 세부 점수가 없는 후보가 하나라도 있으면 손대지 않는다. 일부만 계산하면
 * 같은 화면에서 서로 다른 기준으로 매긴 점수를 나란히 놓게 된다.
 */
/**
 * 이 후보들에 쓰는 축별 비중. 계산이 불가능하면 undefined.
 *
 * 계산할 때와 나중에 검증할 때가 같은 비중을 써야 한다. 두 곳에 따로
 * 적어 두면 한쪽만 고쳐졌을 때 어긋나고, 그것을 잡을 방법이 없어진다.
 */
export function overallWeights(
  items: QuickRecommendation[],
  categoryId: CategoryId,
  priorityId: string
): Map<string, number> | undefined {
  if (items.length < 2) return undefined;
  const axes = commonAxes(items);
  if (axes.length < 2) return undefined;
  return weightsFor(axes, chosenAxisFor(categoryId, priorityId));
}

export function applyPriorityWeighting<T extends QuickRecommendation>(
  items: T[],
  categoryId: CategoryId,
  priorityId: string
): T[] {
  const weights = overallWeights(items, categoryId, priorityId);
  if (!weights) return items;

  const scored = items.map((item) => ({
    item,
    overall: weightedOverall(item, weights),
  }));

  /*
    점수가 같으면 순서가 뒤죽박죽으로 보인다. 88점이 둘인데 하나에만
    "1위"가 붙으면 왜 그쪽이 위인지 설명할 수 없다.
    고른 조건에서 앞선 쪽을 위에 두고, 그것도 같으면 싼 쪽을 위에 둔다.
  */
  const chosenAxis = chosenAxisFor(categoryId, priorityId);
  const axisScore = (item: T) =>
    (chosenAxis &&
      item.scores?.find((score) => score.label === chosenAxis)?.value) ||
    0;

  const ranked = [...scored].sort(
    (a, b) =>
      b.overall - a.overall ||
      axisScore(b.item) - axisScore(a.item) ||
      (a.item.price ?? Number.MAX_SAFE_INTEGER) -
        (b.item.price ?? Number.MAX_SAFE_INTEGER)
  );
  return ranked.map((entry) => ({ ...entry.item, overall: entry.overall }));
}

/** 모든 후보가 함께 가진 축만 쓴다. 한쪽에만 있는 축은 비교에 쓸 수 없다. */
function commonAxes(items: QuickRecommendation[]): string[] {
  const first = items[0]?.scores;
  if (!first?.length) return [];
  return first
    .map((score) => score.label)
    .filter((label) =>
      items.every((item) =>
        item.scores?.some(
          (score) => score.label === label && typeof score.value === "number"
        )
      )
    );
}

function weightsFor(axes: string[], chosenAxis?: string): Map<string, number> {
  const weights = new Map<string, number>();
  const hasChosen = chosenAxis !== undefined && axes.includes(chosenAxis);

  if (!hasChosen) {
    /*
      짝이 되는 축이 없으면 모두 같게 본다. 적어도 세부 점수와 어긋나지는
      않지만, 고른 조건이 순위에 반영되지 않는다는 뜻이기도 하다.
      조용히 넘어가면 왜 조건이 안 먹는지 알 방법이 없어 로그로 남긴다.
    */
    console.warn("[recommend] 고른 조건에 짝이 되는 세부 축이 없어 균등 가중으로 계산합니다.", {
      chosenAxis,
      axes,
    });
    for (const axis of axes) weights.set(axis, 1 / axes.length);
    return weights;
  }

  const rest = (1 - CHOSEN_WEIGHT) / (axes.length - 1);
  for (const axis of axes) {
    weights.set(axis, axis === chosenAxis ? CHOSEN_WEIGHT : rest);
  }
  return weights;
}

export function weightedOverall(
  item: QuickRecommendation,
  weights: Map<string, number>
): number {
  let total = 0;
  weights.forEach((weight, axis) => {
    const value = item.scores?.find((score) => score.label === axis)?.value ?? 0;
    total += weight * value;
  });
  return Math.max(0, Math.min(100, Math.round(total)));
}
