import type { CategoryId } from "@/lib/types/category";

/**
 * public/emojis/ 아래 PNG를 배치하면 됩니다.
 * 메인 카테고리 버튼·폼 타이틀 모두 동일 파일을 쓰고, Tailwind로 크기만 조절합니다.
 */
export const CATEGORY_3D_EMOJI: Record<
  CategoryId,
  { mainSrc: string; formTitleLabel: string }
> = {
  gift: {
    mainSrc: "/emojis/3d-gift.png",
    formTitleLabel: "선물",
  },
  appliance: {
    mainSrc: "/emojis/3d-home.png",
    formTitleLabel: "홈&가전",
  },
  fashion: {
    mainSrc: "/emojis/3d-shirt.png",
    formTitleLabel: "패션",
  },
  date: {
    mainSrc: "/emojis/3d-airplane.png",
    formTitleLabel: "데이트/여행",
  },
  asset: {
    mainSrc: "/emojis/3d-diamond.png",
    formTitleLabel: "고가자산",
  },

  food: { mainSrc: "/emojis/food.png", formTitleLabel: "뭐 먹을까?" },
};
