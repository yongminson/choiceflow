import type { CategoryId } from "@/lib/types/category";
import { isCategoryId } from "@/lib/types/category";

const LABELS: Record<CategoryId, string> = {
  gift: "선물상담",
  appliance: "홈&가전",
  fashion: "패션",
  date: "데이트/여행",
  asset: "고가자산",
  food: "뭐 먹을까?", // 🔥 새롭게 추가된 메뉴 이름!
};

/** 대시보드·히스토리와 동일한 카테고리 표시명 */
export function getCategoryDisplayLabel(categoryId: string | undefined | null): string {
  if (!categoryId || !isCategoryId(categoryId)) return "기타";
  return LABELS[categoryId];
}