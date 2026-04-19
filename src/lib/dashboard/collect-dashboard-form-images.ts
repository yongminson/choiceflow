import type { CategoryId } from "@/lib/types/category";
import type { DashboardFormsState } from "@/lib/types/dashboard-forms";

/** 현재 탭 폼에 첨부된 모든 이미지 File을 순서대로 모읍니다 (A → B → 기타). */
export function collectDashboardImageFiles(
  forms: DashboardFormsState,
  categoryId: CategoryId
): File[] {
  switch (categoryId) {
    case "gift":
      return [...forms.gift.filesA, ...forms.gift.filesB];
    case "appliance":
      return [
        ...forms.appliance.filesA,
        ...forms.appliance.filesB,
        ...forms.appliance.spaceLayoutFiles,
      ];
    case "fashion":
      return [...forms.fashion.filesA, ...forms.fashion.filesB];
    case "date":
      return [...forms.date.filesA, ...forms.date.filesB];
    case "asset":
      return [...forms.asset.filesA, ...forms.asset.filesB];
      case "food":
      return [...forms.food.filesA, ...forms.food.filesB];

    default:
      return [];
  }
}
