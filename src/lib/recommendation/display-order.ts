import type { QuickRecommendation } from "@/lib/types/analyze";

/**
 * 카드를 화면에 세우는 순서를 한 곳에서 정한다.
 *
 * 맨 위 카드는 히어로로 크게 서고 "1위"라고 적힌다. 그 아래 그래프는
 * 종합 적합도 순으로 다시 세운다. 둘이 어긋나면 같은 화면에서 "1위"와
 * "2위"가 같은 곳을 가리키게 된다.
 *
 * 순서를 정하는 곳이 여러 군데였던 것이 문제였다. 가전·선물·패션은
 * 한 곳에서, 음식은 다른 곳에서 각자 세웠다. 한쪽을 고쳐도 다른 쪽은
 * 그대로라 같은 증상이 분야를 옮겨 다니며 다시 나왔다.
 *
 * 그래서 순서는 여기서만 정한다. 분야가 늘어도 이 함수를 부르면 된다.
 */

type SelectionType = NonNullable<QuickRecommendation["selectionType"]>;

/** 점수가 같을 때 쓰는 자리 순서. */
export const SELECTION_ORDER: SelectionType[] = [
  "best",
  "value",
  "reliable",
  "premium",
];

/**
 * 종합 적합도가 높은 것부터 세운다.
 *
 * 점수가 같으면 자리 순서로, 그것도 같으면 싼 쪽을 앞에 둔다.
 * 순서가 정해지면 rank 도 그 순서로 다시 매긴다. 화면이 rank 를
 * 그대로 쓰므로 여기서 맞춰 두지 않으면 번호만 따로 논다.
 */
export function orderForDisplay<T extends QuickRecommendation>(
  items: T[]
): T[] {
  return [...items]
    .sort(
      (a, b) =>
        (b.overall ?? 0) - (a.overall ?? 0) ||
        SELECTION_ORDER.indexOf(a.selectionType || "best") -
          SELECTION_ORDER.indexOf(b.selectionType || "best") ||
        (a.price ?? Number.MAX_SAFE_INTEGER) -
          (b.price ?? Number.MAX_SAFE_INTEGER)
    )
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
