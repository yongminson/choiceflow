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
  reason: string,
  /** 같은 분야 안에서도 용도에 따라 봐야 할 것이 갈린다(렌탈·큰 지출). */
  scenarioId?: string
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
      ...assetChecks(scenarioId),
    ];
  }
  return [{ label: "선택 이유", text: reason, kind: "guide" }];
}

/**
 * 렌탈·큰 지출은 하위 용도가 서로 너무 다르다.
 *
 * 자동차·부동산 기준을 그대로 쓰면 통신 요금제 카드에 "처분 가치 — 보유 기간
 * 뒤 재판매 수요와 예상 감가"가 붙는다. 요금제는 되팔 수 있는 물건이 아니라
 * 읽는 사람에게 아무 뜻도 없는 줄이 되고, 나머지 판단까지 의심하게 만든다.
 *
 * 되팔 수 있는 것에만 처분 가치를 두고, 계약으로 묶이는 것에는 빠져나올 때
 * 드는 비용을 대신 둔다. 실제로 돈이 갈리는 지점이 거기이기 때문이다.
 */
function assetChecks(scenarioId?: string): RecommendationEvidence[] {
  const resale: Record<string, RecommendationEvidence> = {
    car: {
      label: "처분 가치",
      text: "보유 기간 뒤 재판매 수요와 예상 감가를 별도로 계산하세요.",
      kind: "caution",
    },
    property: {
      label: "환금성",
      text: "되팔 때 걸리는 기간과 보유 기간 뒤 시세 변동을 함께 보세요.",
      kind: "caution",
    },
  };
  const exit: Record<string, RecommendationEvidence> = {
    subscription: {
      label: "해지 조건",
      text: "약정 잔여 기간, 위약금, 결합 할인 반환금을 함께 확인하세요.",
      kind: "caution",
    },
    insurance: {
      label: "해지·갱신",
      text: "해지환급금, 갱신 시 보험료 인상 폭, 면책 기간을 확인하세요.",
      kind: "caution",
    },
    rental: {
      label: "의무 기간",
      text: "의무 사용 기간, 중도해지 위약금, 반납·철거 비용을 확인하세요.",
      kind: "caution",
    },
    business: {
      label: "반납·전환",
      text: "계약 종료 시 반납 조건과 구매 전환가를 함께 계산하세요.",
      kind: "caution",
    },
  };

  const contract: RecommendationEvidence =
    scenarioId && scenarioId in exit
      ? {
          label: "계약 위험",
          text: "약정 기간과 요금 인상 조건을 가입 전에 서면으로 확인하세요.",
          kind: "caution",
        }
      : {
          label: "계약 위험",
          text: "보증 범위, 면책, 중도해지 비용을 서면 조건으로 확인하세요.",
          kind: "caution",
        };

  const second = scenarioId ? (resale[scenarioId] ?? exit[scenarioId]) : undefined;
  // 용도를 모를 때는 어느 쪽도 단정하지 않는다. 틀린 기준을 붙이는 것보다
  // 계약 위험만 남기는 편이 낫다.
  return second ? [contract, second] : [contract];
}
