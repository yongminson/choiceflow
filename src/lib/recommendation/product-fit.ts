import { isWrongAudience, type DetectedAudience } from "./gender.ts";
import { matchesTargetItem, type TargetItem } from "./item-match.ts";
import { isWrongOccasion, type Occasion } from "./occasion.ts";
import { isWrongCleaning, type CleaningNeed } from "./cleaning-match.ts";
import { looksLikeAccessory } from "./accessory-match.ts";
import { productBrandKey } from "../monetization/brand-verify.ts";

/**
 * 이 상품을 후보에 올려도 되는지 한 곳에서 판단한다.
 *
 * 판단 규칙이 상품을 고르는 쪽에 흩어져 있었다. 그러다 보니 규칙을 하나
 * 고쳐도 그 규칙이 실제로 어떤 상품을 거르고 어떤 상품을 통과시키는지
 * 확인할 방법이 없었다. 화면에 나온 것을 보고서야 알았다.
 *
 * 규칙을 여기로 모아 두면 실제 상품 이름을 넣어 미리 돌려볼 수 있다.
 * scripts/audit-scenarios.mts 가 이 함수를 그대로 부르므로, 감사에서
 * 통과한 것과 화면에 나가는 것이 같은 판단을 거친다.
 *
 * 문제가 없으면 undefined, 있으면 왜 걸렀는지 한 줄로 돌려준다.
 * 이유를 남기는 것이 중요하다. "왜 후보가 둘뿐인가"를 로그에서 바로
 * 알 수 있어야 다음에 고칠 곳을 찾는다.
 */
export type ProductFitOptions = {
  audience?: DetectedAudience;
  targetItem?: TargetItem;
  occasion?: Occasion;
  cleaning?: CleaningNeed;
  /** 다른 방식 하나를 이미 썼으면 더는 받지 않는다. */
  blockOffMethod?: boolean;
  /** 자리를 다 채운 브랜드. 여기 들어 있으면 건너뛴다. */
  excludeBrands?: ReadonlySet<string>;
  /** 예산 상한. 넘으면 후보로 쓰지 않는다. */
  maxPriceWon?: number;
};

export function productFitProblem(
  productName: string,
  price: number | undefined,
  options: ProductFitOptions = {}
): string | undefined {
  const name = productName.trim();
  if (!name) return "상품명이 없음";

  if (!matchesTargetItem(name, options.targetItem)) {
    return `요청한 품목(${options.targetItem?.name})이 아님`;
  }

  if (isWrongCleaning(name, options.cleaning, options.blockOffMethod)) {
    return "청소 대상이나 방식이 요청과 다름";
  }

  if (looksLikeAccessory(name)) {
    return "본체가 아니라 부속품·소모품";
  }

  if (options.audience && isWrongAudience(name, options.audience)) {
    return `쓸 사람(${options.audience.term})과 맞지 않음`;
  }

  if (options.occasion && isWrongOccasion(name, options.occasion)) {
    return "계절이나 자리에 맞지 않음";
  }

  if (options.excludeBrands && options.excludeBrands.size > 0) {
    const brand = productBrandKey(name);
    if (brand && options.excludeBrands.has(brand)) {
      return `같은 브랜드(${brand})가 이미 자리를 채움`;
    }
  }

  /*
    예산은 사용자가 직접 고른 조건이다. 넘긴 상품은 보여줄 것이 아니라
    못 찾았다고 하는 편이 맞다. 값을 모르는 상품은 여기서 막지 않는다.
    모르는 것을 넘었다고 할 수는 없다.
  */
  if (
    typeof price === "number" &&
    typeof options.maxPriceWon === "number" &&
    options.maxPriceWon > 0 &&
    price > options.maxPriceWon
  ) {
    return `예산(${options.maxPriceWon.toLocaleString("ko-KR")}원)을 넘음`;
  }

  return undefined;
}

/** 쓸 수 있는 상품인지만 알고 싶을 때. */
export function isProductUsable(
  productName: string,
  price: number | undefined,
  options: ProductFitOptions = {}
): boolean {
  return productFitProblem(productName, price, options) === undefined;
}
