import { isCategoryId, type CategoryId } from "@/lib/types/category";

/**
 * AI 분석 소모 크레딧
 * - 고가자산(asset): 항상 2
 * - 홈&가전(appliance): 프리미엄 공간 분석(isPremium) ON일 때만 2, 아니면 1
 * - 선물·패션·데이트: 1
 * - categoryId 없음·알 수 없음: 1
 *
 * @param isPremium — `appliance`일 때만 의미 있음 (프리미엄 공간 분석 토글)
 */
export function getRequiredCreditsForAnalyze(
  categoryId: string | undefined | null,
  isPremium?: boolean | null
): number {
  if (!categoryId || !isCategoryId(categoryId)) {
    return 1;
  }
  const id = categoryId as CategoryId;
  if (id === "asset") {
    return 2;
  }
  if (id === "appliance") {
    return isPremium === true ? 2 : 1;
  }
  return 1;
}

/** 카테고리 칩에 표시하는 짧은 라벨 */
export function getCategoryCreditBadgeLabel(id: CategoryId): string {
  if (id === "asset") return "2크레딧";
  if (id === "appliance") return "1~2크레딧";
  return "1크레딧";
}
