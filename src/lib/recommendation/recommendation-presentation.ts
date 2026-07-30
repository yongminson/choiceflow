import type { RecommendationEvidence } from "@/lib/types/analyze";
import type { CategoryId } from "@/lib/types/category";

const NOISE_WORDS = [
  "무료배송",
  "당일배송",
  "로켓배송",
  "최저가",
  "특가",
  "정품",
  "추천",
];

export function normalizeProductSearchKeyword(
  value: string,
  fallback: string
): string {
  const source = (value || fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|quot|lt|gt);/gi, " ")
    .split(/[,|\n]/, 1)[0]
    .replace(/\b[A-Z]\s*:\s*.*$/i, " ")
    .replace(/\([^)]{18,}\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleaned = NOISE_WORDS.reduce(
    (result, word) => result.replace(new RegExp(word, "g"), " "),
    source
  )
    .replace(/\s+/g, " ")
    .trim();

  return (cleaned || fallback).slice(0, 44).trim();
}

export function categoryEvidence(
  categoryId: CategoryId,
  reason: string
): RecommendationEvidence[] {
  if (categoryId === "gift") {
    return [
      { label: "선물 적합성", text: reason, kind: "guide" },
      {
        label: "받는 경험",
        text: "포장·메시지 카드·희망일 도착 가능 여부를 결제 전에 확인하세요.",
        kind: "guide",
      },
      {
        label: "교환 조건",
        text: "취향이 갈릴 수 있는 상품은 교환 가능 기간과 반품비를 확인하세요.",
        kind: "caution",
      },
    ];
  }
  if (categoryId === "appliance") {
    return [
      { label: "사용 적합성", text: reason, kind: "guide" },
      {
        label: "A/S·보증",
        text: "국내 보증 주체, 무상 보증 기간, 가까운 서비스센터를 확인하세요.",
        kind: "caution",
      },
      {
        label: "유지비·감가",
        text: "소모품·전기료와 중고 수요까지 합친 총비용을 비교하세요.",
        kind: "caution",
      },
    ];
  }
  if (categoryId === "fashion") {
    return [
      { label: "활용도", text: reason, kind: "guide" },
      {
        label: "핏·소재",
        text: "실측 사이즈, 소재 비율, 세탁 방법을 최근 구매 후기와 함께 확인하세요.",
        kind: "guide",
      },
      {
        label: "교환·반품",
        text: "사이즈 교환 가능 여부와 반품 배송비를 결제 전에 확인하세요.",
        kind: "caution",
      },
    ];
  }
  if (categoryId === "date") {
    return [
      { label: "경험 적합성", text: reason, kind: "guide" },
      {
        label: "예약·취소",
        text: "운영 시간, 예약 가능 여부, 우천·취소 규정을 방문 전에 확인하세요.",
        kind: "caution",
      },
    ];
  }
  if (categoryId === "asset") {
    return [
      { label: "총비용", text: reason, kind: "guide" },
      {
        label: "계약 위험",
        text: "보증 범위, 면책, 중도해지 비용을 서면 조건으로 확인하세요.",
        kind: "caution",
      },
      {
        label: "처분 가치",
        text: "보유 기간 뒤 재판매 수요와 예상 감가를 별도로 계산하세요.",
        kind: "caution",
      },
    ];
  }
  return [{ label: "선택 이유", text: reason, kind: "guide" }];
}
