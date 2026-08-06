import {
  Gift,
  HousePlug,
  KeyRound,
  Plane,
  Shirt,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import type { CategoryId } from "@/lib/types/category";

/**
 * 카테고리 아이콘.
 * 3D 렌더 PNG 대신 단색 라인 아이콘을 쓴다. 입체 일러스트는 AI 생성 템플릿의
 * 인상을 주고, 무채색 UI 위에서 혼자 튀어 시선을 뺏는다.
 */
export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  food: Utensils,
  gift: Gift,
  appliance: HousePlug,
  fashion: Shirt,
  date: Plane,
  asset: KeyRound,
};

/** 상세 입력 폼 헤더에 쓰는 라벨 */
export const CATEGORY_FORM_TITLE: Record<CategoryId, string> = {
  food: "뭐 먹을까",
  gift: "선물",
  appliance: "홈&가전",
  fashion: "패션",
  date: "데이트·여행",
  asset: "고가자산·렌탈",
};
