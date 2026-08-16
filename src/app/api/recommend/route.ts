import { NextResponse } from "next/server";

import { generateJson } from "@/lib/ai/generate-json";

import {
  getQuickAdvancedAnswer,
  getQuickBudget,
  getQuickPriority,
  getQuickScenario,
  QUICK_CATEGORY_LABELS,
  type QuickPriorityId,
} from "@/lib/recommendation/quick-options";
import {
  categoryEvidence,
  normalizeProductSearchKeyword,
} from "@/lib/recommendation/recommendation-presentation";
import { buildDirectCoupangNpSearchUrl } from "@/lib/monetization/coupang-search";
import {
  derivedFitChecks,
  placeFitChecks,
  readFitChecks,
  readCaution,
} from "@/lib/recommendation/fit-checks";
import { alignValueLabelWithPrice } from "@/lib/recommendation/selection-labels";
import { toMapKeyword } from "@/lib/recommendation/map-keyword";
import { resolveDisplayName } from "@/lib/monetization/brand-verify";
import { searchCoupangProduct } from "@/lib/monetization/coupang-server";
import type {
  AnalyzeApiResult,
  QuickRecommendation,
} from "@/lib/types/analyze";
import { isCategoryId, type CategoryId } from "@/lib/types/category";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type RequestLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

type Candidate = {
  name: string;
  reason: string;
  searchKeyword: string;
  qualitySummary: string;
  asSummary?: string;
  depreciationSummary?: string;
  selectionType?: SelectionType;
  selectionLabel?: string;
  evidence?: QuickRecommendation["evidence"];
  scores?: QuickRecommendation["scores"];
  overall?: number;
  fitChecks?: QuickRecommendation["fitChecks"];
  caution?: string;
  /** 음식 전용 — 지도에서 주변 가게가 뜨는 짧은 업종·메뉴명 */
  mapKeyword?: string;
};

type SelectionType = "best" | "value" | "reliable" | "premium";

type ValidAdvancedAnswer = {
  questionId: string;
  optionId: string;
  questionLabel: string;
  optionLabel: string;
};

type GooglePlace = {
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
  currentOpeningHours?: { openNow?: boolean };
  businessStatus?: string;
};

type WeatherContext = {
  summary: string;
  searchHint?: string;
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 20;
const RATE_BUCKET_MAX = 5_000;

const SELECTION_ORDER: SelectionType[] = [
  "best",
  "value",
  "reliable",
  "premium",
];
const DEFAULT_SELECTION_LABELS: Record<SelectionType, string> = {
  best: "최종 선택",
  value: "최저가·가성비 선택",
  reliable: "검증 우선 선택",
  premium: "프리미엄 선택",
};

function selectionLabel(
  categoryId: CategoryId,
  selectionType: SelectionType
): string {
  if (categoryId === "food") {
    return {
      best: "지금 가장 잘 맞는 곳",
      value: "가성비 후보",
      reliable: "후기 검증 후보",
      premium: "분위기 후보",
    }[selectionType];
  }
  if (categoryId === "gift") {
    return {
      best: "가장 잘 맞는 선물",
      value: "부담 적은 대안",
      reliable: "실패 확률 낮은 선물",
      premium: "특별한 선물",
    }[selectionType];
  }
  if (categoryId === "fashion") {
    return {
      best: "가장 잘 맞는 선택",
      value: "활용도 높은 대안",
      reliable: "후기 검증 선택",
      premium: "소재 우선 선택",
    }[selectionType];
  }
  if (categoryId === "appliance") {
    return {
      best: "최종 선택",
      value: "가성비 선택",
      reliable: "A/S·신뢰성 선택",
      premium: "성능 우선 선택",
    }[selectionType];
  }
  return DEFAULT_SELECTION_LABELS[selectionType];
}

const FALLBACKS: Record<CategoryId, Record<string, Candidate[]>> = {
  food: {
    solo: [
      candidate("동네 백반", "가격 부담이 적고 메뉴 선택이 쉬워요.", "백반 맛집"),
      candidate("국밥", "혼자 빠르게 먹기 좋고 가격 비교가 쉬워요.", "국밥 맛집"),
      candidate("덮밥", "한 그릇으로 간단하고 메뉴 선택 폭이 넓어요.", "덮밥 맛집"),
    ],
    couple: [
      candidate("파스타", "분위기와 메뉴 호불호를 함께 맞추기 좋아요.", "데이트 파스타 맛집"),
      candidate("이자카야", "대화하기 좋고 여러 메뉴를 나누기 좋아요.", "데이트 이자카야"),
      candidate("브런치", "가볍게 머물며 대화하기 좋아요.", "데이트 브런치 맛집"),
    ],
    group: [
      candidate("고깃집", "여럿이 메뉴를 맞추기 쉽고 후기 비교가 쉬워요.", "단체 고깃집"),
      candidate("닭갈비", "인원수에 맞춰 주문하기 편해요.", "단체 닭갈비 맛집"),
      candidate("중식당", "다양한 메뉴를 나눠 먹기 좋아요.", "회식 중식당"),
    ],
    family: [
      candidate("한정식", "연령대가 달라도 메뉴를 고르기 편해요.", "가족 한정식"),
      candidate("샤브샤브", "취향대로 익혀 먹고 메뉴 구성이 명확해요.", "가족 샤브샤브"),
      candidate("칼국수", "가격 부담이 비교적 낮고 호불호가 적어요.", "가족 칼국수 맛집"),
    ],
    delivery: [
      candidate("치킨", "가격과 배달 후기를 비교하기 쉬운 메뉴예요.", "배달 치킨"),
      candidate("분식", "여러 메뉴를 낮은 가격에 고르기 좋아요.", "배달 분식"),
      candidate("족발·보쌈", "인원수에 맞춰 양과 가격을 비교하기 좋아요.", "배달 족발 보쌈"),
    ],
    healthy: [
      candidate("포케", "재료 구성이 명확하고 한 끼로 간편해요.", "포케 맛집"),
      candidate("샐러드", "열량과 토핑을 취향대로 고르기 쉬워요.", "샐러드 맛집"),
      candidate("생선구이", "단백질과 한식 반찬을 함께 먹기 좋아요.", "생선구이 맛집"),
    ],
  },
  gift: {
    partner: productFallback("gift", "연인 기념일 선물", [
      ["향수", "남녀공용 선물용 향수 50ml"],
      ["가죽 카드지갑", "소가죽 카드지갑 선물포장"],
      ["무드 조명", "충전식 인테리어 무드등"],
      ["가죽 미니 백", "소가죽 미니 크로스백 선물"],
    ]),
    parents: productFallback("gift", "부모님 감사 선물", [
      ["안마기", "목어깨 전동 안마기"],
      ["홍삼 선물세트", "홍삼정 스틱 선물세트"],
      ["전기포트", "스테인리스 전기포트 1.7L"],
      ["안마의자 쿠션", "가정용 안마 쿠션 등마사지"],
    ]),
    friend: productFallback("gift", "친구 생일 선물", [
      ["보온 텀블러", "보온 스테인리스 텀블러 500ml"],
      ["블루투스 스피커", "휴대용 방수 블루투스 스피커"],
      ["핸드크림 세트", "핸드크림 선물세트 기프트박스"],
      ["무선 충전기", "고속 무선 충전 거치대"],
    ]),
    celebration: productFallback("gift", "집들이 선물", [
      ["수건 세트", "호텔 수건 선물세트 10장"],
      ["디퓨저", "대용량 리드 디퓨저 200ml"],
      ["전기포트", "스테인리스 전기포트 1.7L"],
      ["커피 머신", "가정용 캡슐 커피머신"],
    ]),
    child: productFallback("gift", "아이·조카 선물", [
      ["블록 장난감", "유아 대형 블록 장난감 세트"],
      ["아동 도서 세트", "초등 저학년 전집 세트"],
      ["키즈 운동화", "아동 경량 운동화"],
      ["학습 태블릿", "유아 학습 태블릿 완구"],
    ]),
    business: productFallback("gift", "직장·비즈니스 선물", [
      ["드립백 커피 세트", "드립백 커피 선물세트"],
      ["고급 볼펜", "각인 가능 메탈 볼펜 선물"],
      ["핸드케어 세트", "핸드크림 선물세트 기프트박스"],
      ["가죽 다이어리", "가죽 커버 다이어리 각인"],
    ]),
  },
  appliance: {
    kitchen: productFallback("appliance", "주방가전", [
      ["에어프라이어", "대용량 에어프라이어 5L"],
      ["전기포트", "스테인리스 전기포트 1.7L"],
      ["핸드블렌더", "무선 핸드블렌더 세트"],
      ["전기레인지", "2구 하이라이트 전기레인지"],
    ]),
    cleaning: productFallback("appliance", "청소 세탁 가전", [
      ["무선청소기", "가정용 무선 스틱청소기"],
      ["로봇청소기", "물걸레 겸용 로봇청소기"],
      ["의류관리기", "가정용 의류관리기 스타일러"],
      ["건조기", "10kg 히트펌프 건조기"],
    ]),
    living: productFallback("appliance", "생활가전", [
      ["공기청정기", "30평형 공기청정기"],
      ["서큘레이터", "저소음 리모컨 서큘레이터"],
      ["가습기", "대용량 가열식 가습기"],
      ["제습기", "가정용 저소음 제습기 16L"],
    ]),
    digital: productFallback("appliance", "디지털 가전", [
      ["스마트 모니터", "32인치 4K 스마트 모니터"],
      ["태블릿", "10인치 안드로이드 태블릿"],
      ["사운드바", "TV용 블루투스 사운드바"],
      ["프로젝터", "가정용 4K 미니 빔프로젝터"],
    ]),
    health: productFallback("appliance", "건강 뷰티 가전", [
      ["헤어드라이어", "저소음 음이온 헤어드라이어"],
      ["전기면도기", "방수 3중날 전기면도기"],
      ["안마기", "목어깨 전동 안마기"],
      ["두피 마사지기", "전동 두피 마사지기 방수"],
    ]),
    mobile: productFallback("appliance", "모바일 PC 기기", [
      ["무선 이어폰", "노이즈캔슬링 무선 이어폰"],
      ["모니터", "27인치 QHD 모니터"],
      ["태블릿", "10인치 안드로이드 태블릿"],
      ["노트북", "사무용 15인치 가벼운 노트북"],
    ]),
  },
  fashion: {
    work: productFallback("fashion", "출근 패션", [
      ["옥스퍼드 셔츠", "남성 구김방지 옥스퍼드 셔츠"],
      ["슬랙스", "여름 냉감 슬랙스"],
      ["가죽 로퍼", "소가죽 페니 로퍼"],
      ["트렌치 코트", "남성 클래식 트렌치 코트"],
    ]),
    couple: productFallback("fashion", "데이트 패션", [
      ["니트 카디건", "봄가을 얇은 니트 카디건"],
      ["미니 크로스백", "여성 미니 크로스백"],
      ["캐주얼 재킷", "남성 캐주얼 블루종 재킷"],
      ["가죽 자켓", "여성 램스킨 가죽 자켓"],
    ]),
    travel: productFallback("fashion", "여행 패션", [
      ["경량 바람막이", "초경량 패커블 바람막이"],
      ["워킹화", "쿠션 좋은 경량 워킹화"],
      ["여행용 백팩", "기내반입 여행용 백팩 30L"],
      ["여행 캐리어", "기내용 20인치 캐리어"],
    ]),
    event: productFallback("fashion", "행사 모임 패션", [
      ["블레이저", "남성 세미정장 블레이저"],
      ["원피스", "하객 원피스 미디"],
      ["가죽 구두", "남성 정장 가죽 구두"],
      ["정장 세트", "남성 슬림핏 정장 세트"],
    ]),
    daily: productFallback("fashion", "일상 기본 패션", [
      ["기본 티셔츠", "무지 반팔 티셔츠 3팩"],
      ["데님 팬츠", "남성 스트레이트 데님 팬츠"],
      ["데일리 스니커즈", "화이트 데일리 스니커즈"],
      ["가죽 스니커즈", "천연가죽 데일리 스니커즈"],
    ]),
    outdoor: productFallback("fashion", "운동 아웃도어 패션", [
      ["러닝화", "쿠션 러닝화 경량"],
      ["경량 바람막이", "초경량 패커블 바람막이"],
      ["스포츠 백팩", "등산 경량 백팩 25L"],
      ["기능성 재킷", "고어텍스 등산 재킷"],
    ]),
  },
  date: {
    restaurant: genericFallback("데이트 맛집", ["분위기 좋은 식당", "와인바", "브런치 카페"]),
    indoor: genericFallback("실내 데이트", ["전시회", "공방 체험", "보드게임 카페"]),
    outdoor: genericFallback("야외 데이트", ["수목원", "자전거 코스", "야외 체험"]),
    trip: genericFallback("휴식 여행", ["근교 숙소", "온천", "숲 체험"]),
    family: genericFallback("가족 나들이", ["아쿠아리움", "과학관", "테마파크"]),
    stay: genericFallback("숙소 교통", ["호텔", "기차표", "렌터카"]),
  },
  asset: {
    car: assetFallback(["검증된 중고차", "준중형 하이브리드", "장기렌터카"]),
    property: assetFallback(["역세권 소형 주거", "실거주 아파트", "전세 거주"]),
    rental: assetFallback(["구매", "단기 렌탈", "장기 렌탈"]),
    insurance: assetFallback(["단독 보장", "통합 보장", "기존 보험 조정"]),
    subscription: assetFallback(["알뜰폰 요금제", "인터넷 결합", "구독 서비스 정리"]),
    business: assetFallback(["노트북 렌탈", "복합기 렌탈", "업무용 차량 렌탈"]),
  },
};

function candidate(name: string, reason: string, searchKeyword: string): Candidate {
  return {
    name,
    reason,
    searchKeyword,
    qualitySummary: "실제 평점과 후기 수는 연결된 판매처·지도에서 최종 확인해 주세요.",
    // AI 호출이 모두 실패했을 때 나가는 후보다. 적어 주신 조건이 세부까지
    // 반영되지 않았다는 것이 이 후보에서 감수해야 하는 점이다.
    caution: "일반 후보라 적어 주신 조건이 세부까지 반영되지 않았습니다.",
  };
}

/**
 * 폴백 후보. `[표시 이름, 쿠팡 검색어]` 형태로 받는다.
 * 검색어가 일반명사면 쿠팡에서 수만 건이 잡혀 제휴 전환이 사실상 0이 된다.
 */
function productFallback(
  categoryId: "gift" | "appliance" | "fashion",
  context: string,
  entries: Array<[string, string]>
): Candidate[] {
  const reasons = [
    `${context} 상황에서 가장 무난하게 만족도가 높은 선택이에요.`,
    `${context}에서 부담 없는 가격대로 실패 확률이 낮아요.`,
    `${context} 용도로 후기 수가 많아 품질 예측이 쉬운 편이에요.`,
    `${context}에서 예산을 조금 더 쓰면 체감 차이가 큰 선택이에요.`,
  ];
  return entries.map(([name, searchKeyword], index) => ({
    name,
    reason: reasons[index % reasons.length],
    searchKeyword,
    qualitySummary: "후기 수와 최근 낮은 평점을 함께 확인하세요.",
    evidence: categoryEvidence(categoryId, reasons[index % reasons.length]),
  }));
}

function genericFallback(context: string, names: string[]): Candidate[] {
  return names.map((name) => ({
    name,
    reason: `${context}에서 비용 대비 만족도를 비교하기 좋은 후보예요.`,
    searchKeyword: `${context} ${name}`,
    qualitySummary: "최근 방문 후기와 취소·환불 조건을 함께 확인하세요.",
  }));
}

function assetFallback(names: string[]): Candidate[] {
  return names.map((name) => ({
    name,
    reason: "초기 가격보다 총비용과 계약 위험을 먼저 비교할 후보예요.",
    searchKeyword: name,
    qualitySummary: "가격만으로 결정하지 말고 계약서와 실제 상태를 확인하세요.",
    asSummary: "보증 범위, 면책 조건, 중도해지 비용을 서면으로 확인하세요.",
    depreciationSummary: "재판매 수요와 보유 기간에 따른 감가를 별도로 계산해야 해요.",
  }));
}

function segmentFallbackCandidates(
  categoryId: CategoryId,
  candidates: Candidate[]
): Candidate[] {
  const base = candidates.length > 0 ? candidates : [
    candidate("추천 후보", "현재 조건에서 다시 확인할 후보예요.", "추천 후보"),
  ];
  const premiumBase = base[0];
  const premiumSuffix =
    categoryId === "food" ? "분위기 좋은" : "프리미엄";
  const roleCandidates: Candidate[] = [
    base[0],
    base[1] || base[0],
    base[2] || base[0],
    // 프리미엄 슬롯에 별도 상품이 있으면 그대로 쓴다.
    // 없을 때만 대표 후보에 수식어를 붙여 파생시킨다(같은 링크 중복을 피하기 위함).
    base[3] || {
      ...premiumBase,
      name:
        categoryId === "food"
          ? `${premiumSuffix} ${premiumBase.name}`
          : `${premiumBase.name} 상위 선택`,
      searchKeyword: `${premiumBase.searchKeyword} ${premiumSuffix}`,
      reason:
        categoryId === "food"
          ? "가격보다 경험과 분위기를 더 중요하게 볼 때 확인할 후보예요."
          : "예산 안에서 소재·성능·서비스 조건을 한 단계 높인 후보예요.",
    },
  ];
  return roleCandidates.map((item, index) => ({
    ...item,
    selectionType: SELECTION_ORDER[index],
    selectionLabel: selectionLabel(categoryId, SELECTION_ORDER[index]),
    /*
      폴백은 AI 호출이 모두 실패했을 때 나가는 후보다. 적어 주신 조건이
      세부까지 반영되지 않았다는 것이 여기서 감수해야 하는 점이고,
      그 사실을 숨기면 맞춤 추천을 받은 것으로 오해하게 된다.
      후보를 만드는 경로가 여럿이라 마지막에 한 번만 채운다.
    */
    caution:
      item.caution ||
      "일반 후보라 적어 주신 조건이 세부까지 반영되지 않았습니다.",
  }));
}

/** AI가 준 상대 점수를 정해진 축·범위로 정리한다. */
function readScores(
  value: unknown,
  categoryId: CategoryId
): QuickRecommendation["scores"] {
  const axes = scoreAxes(categoryId);
  if (!Array.isArray(value)) return undefined;
  const parsed = value
    .map((item) => {
      const record =
        item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const label = clean(record.label, "", 20);
      const raw = Number(record.value);
      if (!label || !Number.isFinite(raw)) return null;
      return { label, value: Math.max(0, Math.min(100, Math.round(raw))) };
    })
    .filter((item): item is { label: string; value: number } => item !== null)
    .filter((item) => axes.includes(item.label))
    .slice(0, axes.length);
  return parsed.length >= 2 ? parsed : undefined;
}

function readLocation(value: unknown): RequestLocation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Record<string, unknown>;
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const accuracy = Number(input.accuracy);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return undefined;
  }
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : undefined,
  };
}

function readExcludedNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => clean(item, "", 100))
    .filter(Boolean)
    .slice(0, 12);
}

function readAdvancedAnswers(
  categoryId: CategoryId,
  value: unknown
): ValidAdvancedAnswer[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 5) return null;
  const seen = new Set<string>();
  const answers: ValidAdvancedAnswer[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const questionId =
      typeof record.questionId === "string"
        ? record.questionId.slice(0, 40)
        : "";
    const optionId =
      typeof record.optionId === "string" ? record.optionId.slice(0, 40) : "";
    if (!questionId || seen.has(questionId)) return null;
    const matched = getQuickAdvancedAnswer(categoryId, questionId, optionId);
    if (!matched) return null;
    seen.add(questionId);
    answers.push({
      questionId,
      optionId,
      questionLabel: matched.question.label,
      optionLabel: matched.option.label,
    });
  }
  return answers;
}

function isRateLimited(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();

  // 만료 버킷을 청소하지 않으면 인스턴스가 살아 있는 동안 계속 쌓인다.
  if (rateBuckets.size > RATE_BUCKET_MAX) {
    rateBuckets.forEach((bucket, bucketKey) => {
      if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
    });
  }

  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

function clean(value: unknown, fallback = "", max = 240): string {
  if (typeof value !== "string") return fallback;
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** 후보 비교 그래프의 축. 카테고리마다 사용자가 실제로 저울질하는 기준이 다르다. */
function scoreAxes(categoryId: CategoryId): string[] {
  if (categoryId === "food") return ["가격 부담", "맛 만족도", "접근성"];
  if (categoryId === "gift") return ["받는 사람 만족", "가격 부담", "실패 위험 낮음"];
  if (categoryId === "appliance") return ["성능", "가격 부담", "관리 편의", "A/S 안심도"];
  if (categoryId === "fashion") return ["활용도", "가격 부담", "관리 편의"];
  if (categoryId === "date") return ["경험 만족", "비용 부담", "이동 편의"];
  return ["총비용 유리", "안정성", "환금성", "계약 유연성"];
}

/** 고가·렌탈은 외부 구매 링크로 넘기지 않고 판단만 제공한다. */
function isAdvisoryOnly(categoryId: CategoryId): boolean {
  return categoryId === "asset";
}

function categoryDecisionRules(categoryId: CategoryId): string {
  if (categoryId === "gift") {
    return "받는 사람·관계·기념일 적합성, 포장과 배송, 취향 실패 시 교환 가능성을 판단한다. A/S와 중고 감가는 전자제품 후보가 아닌 한 언급하지 않는다.";
  }
  if (categoryId === "appliance") {
    return "핵심 성능, 설치 환경, 국내 A/S와 보증, 소모품·전기료, 중고 감가를 판단한다.";
  }
  if (categoryId === "fashion") {
    return "활용도, 핏과 소재, 세탁 난이도, 사이즈 교환·반품 조건을 판단한다. A/S는 언급하지 않는다.";
  }
  if (categoryId === "date") {
    return "이동 시간, 예약·취소, 날씨 영향, 함께하는 사람에게 맞는 경험을 판단한다.";
  }
  if (categoryId === "asset") {
    return "초기 비용보다 총비용, 계약·중도해지 위험, 보증, 환금성과 감가를 판단한다.";
  }
  return "선택한 상황과 우선조건에 직접 관련된 근거만 판단한다.";
}

/**
 * 쇼핑 카테고리는 검색어가 곧 매출이다. 쿠팡 검색 결과가 한 가지 상품군으로
 * 좁혀지도록 "제품군 + 구분 조건" 형태를 요구한다.
 */
function keywordRules(categoryId: CategoryId): string {
  if (categoryId === "gift" || categoryId === "appliance" || categoryId === "fashion") {
    return `searchKeyword는 쿠팡 검색창에 그대로 넣었을 때 원하는 상품이 첫 화면에 나오도록 쓴다.
- "제품군 + 핵심 구분 조건" 형태로 8~24자. 예: "텀블러"(X) → "보온 스테인리스 텀블러 500ml"(O)
- 예: "블루투스 스피커"(X) → "휴대용 방수 블루투스 스피커"(O)
- 광고 문구(최저가·정품·무료배송), 옵션 나열, 쉼표 연결은 금지한다.
- name은 사용자가 읽을 이름(24자 이내), searchKeyword는 검색용이며 서로 달라도 된다.

[브랜드 표기]
name 에는 브랜드를 쓰지 않는 것을 원칙으로 하고, 어떤 종류의 제품인지로 쓴다.
  예) "삼성 비스포크 제트"(X) → "먼지통 자동비움 로봇청소기"(O)
실제로 링크되는 상품은 검색 결과로 정해지므로, 지금 단계에서 특정 브랜드를
적으면 화면의 이름과 실제 상품이 어긋난다. 실제 브랜드는 서버가 상품을 찾은
뒤 그 상품명에서 가져온다.
서로 다른 회사를 붙여 쓰는 것은 어떤 경우에도 금지한다. 그런 제품은 없다.
  예) "샤오미 로보락"(X), "삼성 다이슨"(X)`;
  }
  if (categoryId === "food") {
    return `mapKeyword 는 지도 앱에서 주변 가게가 뜨는 "업종·메뉴 이름" 하나만 쓴다.
- 2~6자 사이의 짧은 메뉴명 또는 업종명. 예: "삼겹살", "국밥", "파스타", "이자카야"
- 상품처럼 쓰면 지도에 상호가 하나도 안 뜬다. 아래는 모두 금지한다.
  수량/인분 표기("1인용", "2인분"), 가공식품 표현("밀키트", "냉동", "간편식"),
  포장 단위("500g", "세트"), 브랜드명, 수식어("맛있는", "유명한").
- 단어 하나가 원칙이다. 두 단어를 넘기면 지도 결과가 거의 사라진다.
- name 과 searchKeyword 는 자유롭게 쓰되 mapKeyword 만 이 규칙을 지킨다.
  예) name "미니 화로 어묵탕" / mapKeyword "어묵탕"
      name "숯불 삼겹살 한 상" / mapKeyword "삼겹살"
      name "따뜻한 국물 우동"   / mapKeyword "우동"`;
  }
  return `searchKeyword는 네이버에서 조건을 확인할 수 있는 구체적인 검색어로 8~24자로 쓴다.
광고 문구와 쉼표 연결은 금지한다.`;
}

async function generateCandidates(
  categoryId: CategoryId,
  scenarioLabel: string,
  priorityLabel: string,
  budgetLabel: string,
  maxBudgetWon: number | undefined,
  advancedContext: string,
  excludedNames: string[],
  userWish: string,
  fallbacks: Candidate[]
): Promise<{ candidates: Candidate[]; live: boolean }> {
  const segmentedFallbacks = segmentFallbackCandidates(categoryId, fallbacks);

  /*
    버튼만 눌러 들어온 요청은 아직 둘러보는 중이므로, 최근 추천을 빼고 새로운
    후보를 보여주는 편이 낫다.

    반대로 원하는 것을 직접 적었다면 이야기가 다르다. "먼지통 자동으로
    비워지는 걸로"라고 쓴 사람에게 가장 잘 맞는 답은 하나로 좁혀진다.
    그 답을 이미 봤다는 이유로 빼면, 같은 조건을 다시 넣었을 때 더 나쁜
    후보가 올라온다. 새로움이 정확도를 밀어내는 셈이다.

    그래서 자유 입력이 있으면 제외 목록을 쓰지 않고, 생성도 덜 흔들리게 한다.
  */
  const accuracyFirst = userWish.length > 0;
  const effectiveExcluded = accuracyFirst ? [] : excludedNames;

  const prompt = `당신은 한국 소비자의 선택을 돕는 구매·생활 의사결정 전문가다.

${
  userWish
    ? `[절대 제약 — 다른 모든 조건보다 우선한다]
사용자가 직접 적은 요청: "${userWish}"

이 요청을 지키는 것이 이 작업의 성패다. 아래 순서로 처리하라.
1) 요청에서 "제외/빼고/말고/싫어/못 먹어/없이" 같은 부정 표현을 먼저 찾는다.
   해당 대상은 후보에서 완전히 배제한다. 그 대상이 들어간 후보는 단 하나도 만들지 않는다.
   예: "고기 제외" -> 삼겹살·닭갈비·곱창·스테이크 등 육류가 주재료인 후보 전면 금지.
2) 요청에 담긴 맥락(직업, 장소, 동행, 용도, 시점)을 파악해 그에 맞는 후보를 만든다.
   예: "AS기사" -> 온종일 이동·쪼그려 앉는 작업 -> 신축성, 무릎 내구성, 오염 세탁 용이가 핵심.
       정장·수트 계열은 이 맥락에 맞지 않으므로 제외한다.
   예: "신혼집" -> 이미 혼수로 갖춘 물건은 겹친다 -> 수건·디퓨저처럼 흔한 집들이 선물은 피한다.
3) 4개 후보를 만든 뒤, 각 후보가 이 요청을 어기지 않는지 스스로 검토하고 어긋나면 교체한다.

`
    : ""
}카테고리: ${QUICK_CATEGORY_LABELS[categoryId]}
상황: ${scenarioLabel}
최우선 조건: ${priorityLabel}
예산: ${budgetLabel}${maxBudgetWon ? ` (${maxBudgetWon.toLocaleString("ko-KR")}원 이하)` : ""}
정밀 조건: ${advancedContext || "추가 조건 없음"}
${effectiveExcluded.length > 0 ? `이미 추천한 후보(반드시 제외): ${effectiveExcluded.join(", ")}` : ""}

[뻔한 답 금지]
검색만 해도 첫 화면에 나오는 정답은 이 서비스의 가치가 아니다.
그 상황에 실제로 필요하지만 본인은 미처 떠올리지 못한 것을 최소 1개는 넣어라.
선물이라면 실용성이 높지만 남들이 잘 안 고르는 품목, 현금성 상품권과 소품의 조합처럼
받는 사람이 진짜 반기는 구성을 고려하라.

아래 목적별로 정확히 4개 후보를 추천하라.
- best: 전체 조건을 종합한 최종 선택
- value: 실제 구매비용과 유지비가 낮은 최저가·가성비 선택
- reliable: 이 카테고리에 맞는 실패 위험과 후기 신뢰성을 우선한 선택
- premium: 예산 범위 안에서 성능·소재·경험을 높인 프리미엄 선택

카테고리별 판단 규칙: ${categoryDecisionRules(categoryId)}
${keywordRules(categoryId)}

확인하지 않은 실시간 평점·후기 수·가격은 절대 만들지 않는다.
사용자가 직접 적은 요청이 있으면 그것을 다른 어떤 조건보다 우선한다.
요청에 "~말고", "~빼고" 같은 제외 조건이 있으면 그 항목은 후보에서 완전히 뺀다.
최우선 조건과 예산을 반드시 지킨다. 4개 후보는 서로 뚜렷하게 다른 제품군이어야 한다.
reason은 이 사용자의 상황(${scenarioLabel} · ${priorityLabel} 우선)에 직접 연결해 70~110자로 쓴다.
"무난해요" 같은 뭉뚱그린 표현 대신, 무엇이 어떻게 좋은지 한 가지는 구체적으로 짚는다.
4개의 reason이 서로 다른 근거를 담게 하고 같은 문장을 반복하지 않는다.
qualitySummary는 구매 전에 직접 확인해야 할 항목을 40자 내외로 쓴다.

overall: 이 사용자의 조건 전체를 종합했을 때의 적합도를 0~100으로 매긴다.
- 사용자의 요청과 상황에 얼마나 잘 맞는지를 하나의 숫자로 요약한 값이다.
- 4개가 비슷하면 판단에 도움이 되지 않는다. 1등과 4등은 최소 15점 이상 벌린다.
- best로 고른 후보가 가장 높아야 한다.

scores: 아래 축으로 후보끼리 비교한 상대 점수를 0~100으로 매긴다.
축: ${scoreAxes(categoryId).join(", ")}
- 절대 수치가 아니라 이 4개 후보 사이의 상대 비교다.
- 가격 부담 축은 "부담이 적을수록 높은 점수"다.

fitChecks: 이 사용자가 고른 조건을 항목별로 지켰는지 3~4개로 끊어 쓴다.
- 줄글을 요약하지 말고, 사용자가 실제로 고른 조건을 하나씩 확인해 준다.
  확인할 조건: ${[scenarioLabel, `${priorityLabel} 우선`, budgetLabel, userWish]
    .filter(Boolean)
    .join(" / ")}
- 여기에는 조건에 맞는 부분만 쓴다(ok=true). 감수할 점은 caution 에 따로 쓴다.
- 각 항목은 20자 내외의 짧은 서술.

caution: 이 후보를 골랐을 때 감수해야 하는 점을 정확히 한 문장으로 쓴다.
- 빈 문자열은 허용하지 않는다. 비운 응답은 잘못된 응답으로 간주한다.
- 넣을 것이 없다고 판단되면 다시 생각하라. 어떤 선택에도 대가는 있다.
  값이 싸면 빠지는 기능이 있고, 기능이 많으면 관리할 것이 늘고,
  관리가 편하면 소모품 값이 들고, 성능이 좋으면 크고 무겁다.
- 예: "물걸레 패드를 주기적으로 세탁해야 합니다"
      "스틱 형태라 사용 중 직접 들고 있어야 합니다"
      "이 가격대는 자동 먼지비움이 빠지는 경우가 많습니다"
- 4개 후보의 caution 이 서로 달라야 한다. 같은 문장을 돌려쓰지 않는다.
- 30~50자, "~합니다" 로 끝나는 한 문장.
- 사양을 단정하지 않는다는 아래 규칙은 caution 에도 그대로 적용된다.

[fitChecks 와 caution 에 쓰면 안 되는 것 — 중요]
당신은 실제로 링크될 상품을 보지 못한다. 검색 결과로 정해지기 때문이다.
그러므로 특정 상품에 어떤 기능이나 사양이 있다고 단정하면 안 된다.
  쓰지 말 것: "자동 먼지비움 기능 탑재", "소음 55dB", "3년 무상보증",
             "배터리 2시간", "정품 인증" — 확인할 수 없는 사양 주장이다.
  가격·배송·평점·후기 수도 쓰지 않는다. 서버가 실제 값으로 따로 채운다.

대신 사용자의 조건이 무엇을 뜻하는지를 쓴다. 상품이 아니라 조건에 대한 설명이다.
  쓸 것: "30평대라면 흡입력보다 주행 경로가 중요",
        "아이가 있으면 소음 기준을 먼저 볼 것",
        "이 가격대는 자동비움 기능이 빠지는 경우가 많음",
        "편리함을 우선하면 관리 주기를 감수해야 함"

JSON 배열만 응답:
[{"selectionType":"best|value|reliable|premium","name":"","reason":"","searchKeyword":"","qualitySummary":"","asSummary":"","depreciationSummary":"","overall":0,"scores":[{"label":"축 이름","value":0}],"fitChecks":[{"ok":true,"text":""}],"caution":""${
    categoryId === "food" ? ',"mapKeyword":""' : ""
  }}]`;

  try {
    // 같은 요청에 같은 답이 나오도록 흔들림을 줄인다.
    const generated = await generateJson(
      prompt,
      accuracyFirst ? { temperature: 0.2 } : {}
    );
    // 배열을 요구했지만 provider에 따라 {items:[...]} 형태로 감싸 오는 경우가 있다.
    const raw = generated?.parsed;
    const parsed = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { items?: unknown })?.items)
        ? (raw as { items: unknown[] }).items
        : Array.isArray((raw as { results?: unknown })?.results)
          ? (raw as { results: unknown[] }).results
          : null;
    if (!parsed) {
      return { candidates: segmentedFallbacks, live: false };
    }
    const candidates = parsed.slice(0, 4).map((item, index) => {
      const record =
        item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const fallback = segmentedFallbacks[index];
      const rawSelectionType =
        typeof record.selectionType === "string"
          ? record.selectionType
          : fallback.selectionType;
      const selectionType = SELECTION_ORDER.includes(
        rawSelectionType as SelectionType
      )
        ? (rawSelectionType as SelectionType)
        : fallback.selectionType!;
      return {
        selectionType,
        selectionLabel: selectionLabel(categoryId, selectionType),
        name: clean(record.name, fallback.name, 44),
        reason: clean(record.reason, fallback.reason),
        searchKeyword: normalizeProductSearchKeyword(
          clean(record.searchKeyword, fallback.searchKeyword, 100),
          fallback.searchKeyword
        ),
        qualitySummary: clean(
          record.qualitySummary,
          fallback.qualitySummary
        ),
        asSummary:
          categoryId === "appliance" || categoryId === "asset"
            ? clean(record.asSummary, fallback.asSummary)
            : undefined,
        depreciationSummary:
          categoryId === "appliance" || categoryId === "asset"
            ? clean(record.depreciationSummary, fallback.depreciationSummary)
            : undefined,
        evidence: categoryEvidence(
          categoryId,
          clean(record.reason, fallback.reason)
        ),
        overall: (() => {
          const raw = Number(record.overall);
          return Number.isFinite(raw)
            ? Math.max(0, Math.min(100, Math.round(raw)))
            : undefined;
        })(),
        scores: readScores(record.scores, categoryId),
        fitChecks: readFitChecks(record.fitChecks),
        caution: readCaution(record.caution, record.fitChecks),
        mapKeyword:
          categoryId === "food"
            ? clean(record.mapKeyword, "", 20) || undefined
            : undefined,
      };
    });
    const uniqueRoles = new Set(
      candidates.map((item) => item.selectionType)
    );
    return candidates.length === 4 && uniqueRoles.size === 4
      ? {
          candidates: candidates.sort(
            (a, b) =>
              SELECTION_ORDER.indexOf(a.selectionType!) -
              SELECTION_ORDER.indexOf(b.selectionType!)
          ),
          live: true,
        }
      : { candidates: segmentedFallbacks, live: false };
  } catch (error) {
    console.error("[recommend] Candidate generation failed", error);
    return { candidates: segmentedFallbacks, live: false };
  }
}

async function enrichProductPrices(
  candidates: Candidate[],
  maxBudgetWon?: number
): Promise<{ recommendations: QuickRecommendation[]; live: boolean }> {
  /*
    후보마다 따로 검색하면 서로 다른 검색어가 같은 상품을 물어 오는 일이 생긴다.
    실제로 "가성비 선택"과 "한 단계 위"에 같은 상품이 같은 가격으로 걸린 화면이
    나갔다. 한 단계 위인데 값이 같으면 한 단계 위가 아니다.

    그래서 순차로 돌면서 이미 쓴 상품은 건너뛴다. 병렬보다 느리지만 후보가
    넷뿐이라 감당할 수 있고, 슬롯이 중복되는 것보다 낫다.
  */
  const usedProductKeys = new Set<string>();
  const items: QuickRecommendation[] = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const searchKeyword = normalizeProductSearchKeyword(
      candidate.searchKeyword,
      candidate.name
    );

    let product: Awaited<ReturnType<typeof searchCoupangProduct>> = null;
    try {
      // 쿠팡 상품 검색은 썸네일·실가격과 함께 제휴 추적이 포함된 상품 상세
      // 링크를 준다. 검색 페이지 딥링크보다 전환도 추적도 유리하다.
      product = await searchCoupangProduct(searchKeyword, maxBudgetWon, {
        excludeProductUrls: usedProductKeys,
      });
    } catch {
      product = null;
    }

    if (product) {
      usedProductKeys.add(product.productUrl);
      items.push({
        rank: index + 1,
        ...candidate,
        searchKeyword,
        price: product.productPrice,
        priceLabel: product.isRocket ? "쿠팡 · 로켓배송" : "쿠팡 판매가",
        imageUrl: product.productImage || undefined,
        productName: product.productName,
        isRocket: product.isRocket,
        sourceUrl: product.productUrl,
        sourceLabel: "쿠팡에서 이 상품 보기",
        // 카드 제목은 실제로 링크되는 상품의 이름을 쓴다. AI 가 지은 이름은
        // "자동 먼지비움 로봇청소기"처럼 제품명이 아니라 분류 설명이라
        // 무엇을 사라는 것인지 알 수 없다.
        name: resolveDisplayName(candidate.name, product.productName),
      });
      continue;
    }

    items.push({
      rank: index + 1,
      ...candidate,
      searchKeyword,
      sourceUrl: buildDirectCoupangNpSearchUrl(searchKeyword),
      sourceLabel: "쿠팡에서 이 상품 검색",
      name: resolveDisplayName(candidate.name, undefined),
    });
  }

  const labelled = alignValueLabelWithPrice(items);

  const sorted = [...labelled].sort(
    (a, b) =>
      SELECTION_ORDER.indexOf(a.selectionType || "best") -
      SELECTION_ORDER.indexOf(b.selectionType || "best")
  );

  // 체크리스트는 실제 가격·배송이 확정된 뒤에 채워야 "예산 안에 들어옴"이 사실이 된다.
  // 후보끼리 비교해야 나오는 항목이 있어 전체를 함께 넘긴다.
  const prices = sorted
    .map((item) => item.price)
    .filter((price): price is number => typeof price === "number");
  const cheapest = prices.length > 1 ? Math.min(...prices) : undefined;
  const priciest = prices.length > 1 ? Math.max(...prices) : undefined;

  return {
    recommendations: sorted.map((item, index) => ({
      ...item,
      rank: index + 1,
      fitChecks: derivedFitChecks(item, maxBudgetWon, {
        cheapestPrice: cheapest,
        priciestPrice: priciest,
      }),
    })),
    live: items.some((item) => typeof item.price === "number"),
  };
}

function priceLevelScore(priceLevel?: string): number {
  if (priceLevel === "PRICE_LEVEL_INEXPENSIVE") return 1;
  if (priceLevel === "PRICE_LEVEL_MODERATE") return 0.7;
  if (priceLevel === "PRICE_LEVEL_EXPENSIVE") return 0.35;
  if (priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") return 0.1;
  return 0.5;
}

function currentMealContext(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );
  if (hour >= 5 && hour < 10) return "아침";
  if (hour >= 10 && hour < 15) return "점심";
  if (hour >= 15 && hour < 18) return "간식";
  if (hour >= 18 && hour < 22) return "저녁";
  return "늦은 시간";
}

function distanceMeters(
  origin: RequestLocation,
  destination?: { latitude?: number; longitude?: number }
): number | undefined {
  if (
    typeof destination?.latitude !== "number" ||
    typeof destination.longitude !== "number"
  ) {
    return undefined;
  }
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const startLatitude = toRadians(origin.latitude);
  const endLatitude = toRadians(destination.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function findWeatherContext(
  location: RequestLocation
): Promise<WeatherContext | undefined> {
  const apiKey = process.env.GOOGLE_WEATHER_API_KEY?.trim();
  if (!apiKey) return undefined;
  const url = new URL(
    "https://weather.googleapis.com/v1/currentConditions:lookup"
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("location.latitude", String(location.latitude));
  url.searchParams.set("location.longitude", String(location.longitude));
  url.searchParams.set("languageCode", "ko");
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(3500),
  });
  if (!response.ok) {
    console.warn("Google Weather lookup failed", response.status);
    return undefined;
  }
  const payload = (await response.json()) as {
    weatherCondition?: { description?: { text?: string }; type?: string };
    temperature?: { degrees?: number };
    precipitation?: { probability?: { percent?: number } };
  };
  const description = clean(
    payload.weatherCondition?.description?.text,
    "",
    40
  );
  const temperature = payload.temperature?.degrees;
  const type = payload.weatherCondition?.type || "";
  const rainChance = payload.precipitation?.probability?.percent;
  const details = [
    description,
    typeof temperature === "number" ? `${Math.round(temperature)}°C` : "",
    typeof rainChance === "number" && rainChance >= 30
      ? `강수확률 ${Math.round(rainChance)}%`
      : "",
  ].filter(Boolean);
  const searchHint =
    /RAIN|DRIZZLE|SNOW|SLEET/.test(type) || (rainChance || 0) >= 50
      ? "따뜻한 음식"
      : typeof temperature === "number" && temperature >= 29
        ? "시원한 음식"
        : typeof temperature === "number" && temperature <= 5
          ? "따뜻한 음식"
          : undefined;
  return details.length > 0
    ? { summary: `현재 날씨 ${details.join(" · ")}`, searchHint }
    : undefined;
}

async function findGooglePlaces(
  scenarioLabel: string,
  priorityId: QuickPriorityId,
  location: RequestLocation,
  advancedAnswers: ValidAdvancedAnswer[],
  excludedNames: string[],
  userWish: string,
  weather?: WeatherContext
): Promise<QuickRecommendation[] | undefined> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return undefined;

  const distanceAnswer = advancedAnswers.find(
    (answer) => answer.questionId === "distance"
  );
  const radius =
    distanceAnswer?.optionId === "walk"
      ? 1200
      : distanceAnswer?.optionId === "near"
        ? 5000
        : 10_000;
  const searchDetails = advancedAnswers
    .filter((answer) => answer.questionId === "diet" || answer.questionId === "service")
    .map((answer) => answer.optionLabel)
    .join(" ");
  const mealContext = currentMealContext();

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.location,places.currentOpeningHours.openNow,places.businessStatus",
      },
      body: JSON.stringify({
        // 상황(혼밥·데이트·회식…)이 쿼리에 들어가지 않으면 어떤 시나리오를 골라도
        // 같은 결과가 나온다.
        // 사용자가 직접 적은 요청을 검색어 맨 앞에 둔다. 이게 실제로 먹고 싶은 것이다.
        textQuery: `${userWish} ${scenarioLabel} ${weather?.searchHint || ""} 맛집 ${searchDetails}`
          .replace(/\s+/g, " ")
          .trim(),
        includedType: "restaurant",
        strictTypeFiltering: true,
        languageCode: "ko",
        regionCode: "KR",
        pageSize: 15,
        rankPreference:
          priorityId === "convenience" ? "DISTANCE" : "RELEVANCE",
        locationBias: {
          circle: {
            center: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            radius,
          },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!response.ok) {
    console.warn("Google Places text search failed", response.status);
    return undefined;
  }
  const payload = (await response.json()) as { places?: GooglePlace[] };
  const excluded = new Set(excludedNames.map((name) => name.toLocaleLowerCase("ko")));
  const places = (payload.places || [])
    .filter(
      (place) =>
        place.businessStatus !== "CLOSED_PERMANENTLY" &&
        !excluded.has(
          clean(place.displayName?.text, "", 100).toLocaleLowerCase("ko")
        )
    )
    .map((place, index, all) => {
      const price = priceLevelScore(place.priceLevel);
      const rating = (place.rating || 3.5) / 5;
      const reviews = Math.min(
        1,
        Math.log10((place.userRatingCount || 0) + 1) / 3
      );
      const relevance = Math.max(0, 1 - index / Math.max(all.length, 1));
      const distance = distanceMeters(location, place.location);
      const proximity =
        typeof distance === "number" ? Math.max(0, 1 - distance / radius) : 0.4;
      const open = place.currentOpeningHours?.openNow === true ? 1 : 0.45;
      const priorityScore =
        priorityId === "price"
          ? price * 0.55 + rating * 0.3 + reviews * 0.15
          : priorityId === "performance"
            ? price * 0.1 + rating * 0.55 + reviews * 0.3 + relevance * 0.05
            : priorityId === "convenience"
              ? price * 0.1 + rating * 0.25 + reviews * 0.15 + proximity * 0.35 + open * 0.15
              : price * 0.15 + rating * 0.5 + reviews * 0.3 + relevance * 0.05;
      return {
        place,
        price,
        rating,
        reviews,
        relevance,
        proximity,
        distance,
        priorityScore,
      };
    });

  if (places.length === 0) return undefined;
  const used = new Set<string>();
  const selected = SELECTION_ORDER.map((selectionType) => {
    const ranked = [...places].sort((a, b) => {
      const score = (item: (typeof places)[number]) => {
        if (selectionType === "best") return item.priorityScore;
        if (selectionType === "value") {
          return item.price * 0.7 + item.rating * 0.2 + item.reviews * 0.1;
        }
        if (selectionType === "reliable") {
          return item.rating * 0.55 + item.reviews * 0.4 + item.relevance * 0.05;
        }
        return (
          (1 - item.price) * 0.45 +
          item.rating * 0.4 +
          item.reviews * 0.15
        );
      };
      return score(b) - score(a);
    });
    const chosen = ranked.find((item) => {
      const key = `${item.place.displayName?.text || ""}:${item.place.formattedAddress || ""}`;
      return !used.has(key);
    });
    if (chosen) {
      used.add(
        `${chosen.place.displayName?.text || ""}:${chosen.place.formattedAddress || ""}`
      );
    }
    return chosen ? { ...chosen, selectionType } : undefined;
  }).filter(
    (
      item
    ): item is (typeof places)[number] & { selectionType: SelectionType } =>
      Boolean(item)
  );

  return selected.map(({ place, selectionType, distance }, index) => {
    const verifiedFacts = [
      typeof distance === "number"
        ? `현재 위치에서 직선거리 약 ${distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(1)}km`}`
        : "",
      typeof place.rating === "number"
        ? `Google 평점 ${place.rating.toFixed(1)}`
        : "",
      typeof place.userRatingCount === "number"
        ? `후기 ${place.userRatingCount.toLocaleString("ko-KR")}개`
        : "",
      place.currentOpeningHours?.openNow === true
        ? "현재 영업 중"
        : place.currentOpeningHours?.openNow === false
          ? "현재 영업 종료"
          : "",
    ].filter(Boolean);
    const roleReason =
      selectionType === "value"
        ? "주변 후보 중 가격대와 평점을 함께 본 가성비 후보예요."
        : selectionType === "reliable"
          ? "평점과 누적 후기 수를 크게 반영한 후기 검증 후보예요."
          : selectionType === "premium"
            ? "가격보다 분위기와 경험을 우선해 고른 후보예요."
            : "거리, 선택 조건, 평점과 후기 수를 종합해 지금 가장 잘 맞는 후보로 골랐어요.";
    return {
      rank: index + 1,
      selectionType,
      selectionLabel: selectionLabel("food", selectionType),
      name: clean(place.displayName?.text, "주변 음식점", 100),
      reason: `${roleReason} ${mealContext} 시간대${weather ? `와 ${weather.summary.replace("현재 날씨 ", "")}` : ""}를 함께 고려했어요.`,
      searchKeyword: clean(place.displayName?.text, `${scenarioLabel} 맛집`, 100),
      qualitySummary:
        verifiedFacts.join(" · ") || "Google 지도에서 최신 정보를 확인해 주세요.",
      evidence: [
        {
          label: "선택 이유",
          text: roleReason,
          kind: "guide" as const,
        },
        {
          label: "확인된 정보",
          text:
            verifiedFacts.join(" · ") ||
            "평점·영업시간 정보가 없어 지도에서 직접 확인이 필요해요.",
          kind: "verified" as const,
        },
        {
          label: "상황 반영",
          text: `${mealContext} 시간대${weather ? ` · ${weather.summary}` : ""}`,
          kind: "guide" as const,
        },
      ],
      // 지도 데이터는 실제로 확인된 사실이라 체크리스트로 쓰기에 가장 적합하다.
      fitChecks: placeFitChecks({
        distanceMeters: distance,
        rating: place.rating,
        reviewCount: place.userRatingCount,
        openNow: place.currentOpeningHours?.openNow,
      }),
      rating: place.rating,
      reviewCount: place.userRatingCount,
      priceLevel: place.priceLevel,
      address: clean(place.formattedAddress, "", 160) || undefined,
      distanceMeters: distance,
      openNow: place.currentOpeningHours?.openNow,
      sourceUrl: safeUrl(place.googleMapsUri),
      sourceLabel: "이 음식점 지도에서 보기",
      dataStatus: "verified-place" as const,
    };
  });
}

/**
 * 메뉴 이름으로 지도를 열 때 사용자의 현재 위치를 중심으로 잡는다.
 * 좌표가 없으면 지도는 IP 기준 임의 지역을 보여줘 "내 주변"이 되지 않는다.
 */
function buildNearbyMapUrl(keyword: string, location?: RequestLocation): string {
  const query = encodeURIComponent(toMapKeyword(keyword));
  if (!location) {
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  const lat = location.latitude.toFixed(6);
  const lng = location.longitude.toFixed(6);
  // /@lat,lng,zoom 형식은 지도 중심을 그 좌표로 고정한다.
  return `https://www.google.com/maps/search/${query}/@${lat},${lng},15z`;
}

/** AI가 만든 메뉴 후보를 지도 검색 결과 카드로 변환한다. */
function buildAiFoodRecommendations(
  candidates: Candidate[],
  priorityLabel: string,
  budgetLabel: string,
  userWish: string,
  location?: RequestLocation
): QuickRecommendation[] {
  return candidates.map((item, index) => ({
    rank: index + 1,
    ...item,
    evidence: [
      {
        label: "이 메뉴를 고른 이유",
        text: item.reason,
        kind: "guide" as const,
      },
      ...(userWish
        ? [
            {
              label: "요청 반영",
              text: `"${userWish}" 조건에 맞춰 고른 후보예요.`,
              kind: "guide" as const,
            },
          ]
        : []),
      {
        label: "확인 필요",
        text: `${priorityLabel} 우선 · ${budgetLabel} 기준입니다. 실제 매장·영업 상태는 지도에서 확인하세요.`,
        kind: "caution" as const,
      },
    ],
    sourceUrl: buildNearbyMapUrl(item.mapKeyword || item.searchKeyword, location),
    sourceLabel: location ? "내 주변에서 이 메뉴 찾기" : "이 메뉴 지도에서 찾기",
    dataStatus: "category-guide" as const,
  }));
}

function buildFallbackFoodRecommendations(
  candidates: Candidate[],
  priorityLabel: string,
  budgetLabel: string,
  advancedContext = "",
  location?: RequestLocation
): QuickRecommendation[] {
  return segmentFallbackCandidates("food", candidates).map((item, index) => ({
    rank: index + 1,
    ...item,
    reason: `${item.reason} 다만 실제 주변 음식점 데이터는 확인하지 못했으므로, 아래 지도 검색에서 영업 중인 매장을 골라야 해요.`,
    evidence: [
      {
        label: "메뉴를 고른 이유",
        text: `${priorityLabel} 우선 · ${budgetLabel}${advancedContext ? ` · ${advancedContext}` : ""}`,
        kind: "guide" as const,
      },
      {
        label: "확인 필요",
        text: "현재 위치의 실제 매장명·평점·후기는 확인되지 않았어요. 지도 결과를 추천 매장으로 오해하면 안 됩니다.",
        kind: "caution" as const,
      },
    ],
    sourceUrl: buildNearbyMapUrl(item.searchKeyword, location),
    sourceLabel: location ? "내 주변에서 이 메뉴 찾기" : "지도에서 이 메뉴 검색",
    dataStatus: "category-guide" as const,
  }));
}

function buildFallbackNonFoodRecommendations(
  categoryId: CategoryId,
  candidates: Candidate[]
): QuickRecommendation[] {
  const shopping = ["gift", "appliance", "fashion"].includes(categoryId);
  return segmentFallbackCandidates(categoryId, candidates).map((item, index) => ({
    rank: index + 1,
    ...item,
    evidence: item.evidence || categoryEvidence(categoryId, item.reason),
    ...(shopping
      ? {
          sourceUrl: buildDirectCoupangNpSearchUrl(
            normalizeProductSearchKeyword(item.searchKeyword, item.name)
          ),
          sourceLabel: "쿠팡에서 가격 확인",
        }
      : isAdvisoryOnly(categoryId)
        ? {}
        : {
            sourceUrl: `https://search.naver.com/search.naver?query=${encodeURIComponent(
              item.searchKeyword
            )}`,
            sourceLabel: "네이버에서 조건 확인",
          }),
  }));
}

function toAnalyzeResult(
  categoryId: CategoryId,
  scenarioId: string,
  scenarioLabel: string,
  priorityId: string,
  priorityLabel: string,
  budgetId: string,
  budgetLabel: string,
  maxBudgetWon: number | undefined,
  refinementAnswerCount: number,
  userWish: string,
  recommendations: QuickRecommendation[],
  status: AnalyzeApiResult["providerStatus"],
  locationUsed: boolean,
  recommendationContext: string[] = []
): AnalyzeApiResult {
  // 목적별 4개(best·value·reliable·premium)를 모두 노출한다.
  // 후보 1개 = 제휴 링크 1개이므로 임의로 잘라내지 않는다.
  const limitedRecommendations = recommendations.slice(0, 4);
  const first = limitedRecommendations[0];
  const second = limitedRecommendations[1];
  const third = limitedRecommendations[2];
  const conditionConfidence = Math.min(
    94,
    80 + refinementAnswerCount * 2
  );
  return {
    winner: "A",
    winnerName: first?.name || "추천 후보",
    score: conditionConfidence,
    winPercentage: conditionConfidence,
    regretProbability: 100 - conditionConfidence,
    realReviews: [],
    comparisonMetrics: [],
    optionC: third
      ? {
          name: third.name,
          reason: third.reason,
          searchKeyword: third.searchKeyword,
        }
      : undefined,
    table: {
      A: {
        pros: [first?.qualitySummary, first?.asSummary].filter(
          (item): item is string => Boolean(item)
        ),
        cons: [first?.depreciationSummary].filter(
          (item): item is string => Boolean(item)
        ),
      },
      B: {
        pros: [second?.qualitySummary, second?.asSummary].filter(
          (item): item is string => Boolean(item)
        ),
        cons: [second?.depreciationSummary].filter(
          (item): item is string => Boolean(item)
        ),
      },
    },
    killerInsight: first?.reason || "",
    summary: `${scenarioLabel}에 맞는 최종 선택과 대안 2개를 정리했어요.`,
    analysisText: first?.reason || "",
    searchKeyword: first?.searchKeyword || null,
    optionALabel: first?.name || "추천 후보",
    optionBLabel: second?.name || "다른 후보",
    priceAManwon: first?.price ? Math.round(first.price / 10_000) : 0,
    priceBManwon: recommendations[1]?.price
      ? Math.round(recommendations[1].price! / 10_000)
      : 0,
    budgetManwon: 0,
    categoryId,
    recommendationMode: "quick",
    quickScenarioLabel: scenarioLabel,
    quickScenarioId: scenarioId,
    quickPriorityLabel: priorityLabel,
    quickPriorityId: priorityId,
    quickBudgetLabel: budgetLabel,
    quickBudgetId: budgetId,
    quickUserWish: userWish || undefined,
    quickMaxBudgetWon: maxBudgetWon,
    quickCandidateCount: limitedRecommendations.length,
    refinementAnswerCount,
    quickRecommendations: limitedRecommendations,
    providerStatus: status,
    locationUsed,
    recommendationContext,
    advisory: isAdvisoryOnly(categoryId)
      ? "이 분야는 계약 조건과 개인 상황에 따라 유불리가 크게 갈립니다. 위 판단은 방향을 좁히는 참고용이며, 실제 계약 전에는 총비용·중도해지 비용·보증 범위를 반드시 서면으로 확인하세요. 한 번의 서명이 수년간의 비용을 결정합니다."
      : undefined,
    checkedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const rawCategory = typeof body.categoryId === "string" ? body.categoryId : null;
  const scenarioId =
    typeof body.scenarioId === "string" ? body.scenarioId.slice(0, 40) : "";
  const priorityId =
    typeof body.priorityId === "string" ? body.priorityId.slice(0, 30) : "";
  const budgetId =
    typeof body.budgetId === "string" ? body.budgetId.slice(0, 40) : "";
  if (!isCategoryId(rawCategory)) {
    return NextResponse.json(
      { ok: false, error: "지원하지 않는 선택 분야입니다." },
      { status: 400 }
    );
  }
  const scenario = getQuickScenario(rawCategory, scenarioId);
  if (!scenario) {
    return NextResponse.json(
      { ok: false, error: "지원하지 않는 상황입니다." },
      { status: 400 }
    );
  }
  const priority = getQuickPriority(rawCategory, priorityId);
  if (!priority) {
    return NextResponse.json(
      { ok: false, error: "지원하지 않는 우선조건입니다." },
      { status: 400 }
    );
  }
  const budget = getQuickBudget(rawCategory, scenarioId, budgetId);
  if (!budget) {
    return NextResponse.json(
      { ok: false, error: "지원하지 않는 예산 범위입니다." },
      { status: 400 }
    );
  }
  const advancedAnswers = readAdvancedAnswers(
    rawCategory,
    body.advancedAnswers
  );
  if (!advancedAnswers) {
    return NextResponse.json(
      { ok: false, error: "정밀 추천 답변이 올바르지 않습니다." },
      { status: 400 }
    );
  }
  const advancedContext = advancedAnswers
    .map((answer) => `${answer.questionLabel}: ${answer.optionLabel}`)
    .join(", ");

  const fallbacks = FALLBACKS[rawCategory][scenarioId];
  const location = readLocation(body.location);
  // 버튼만으로는 담기지 않는 실제 의도("매운 국물", "향수 말고")를 받는다.
  const userWish = clean(body.userWish, "", 100);
  // 원하는 것을 직접 적었다면 새로움보다 정확도가 먼저다. 최근 추천을
  // 빼지 않는다. 자세한 이유는 generateCandidates 주석에 적어 두었다.
  const excludedNames = userWish ? [] : readExcludedNames(body.excludedNames);

  try {
    if (rawCategory === "food") {
      const weather = location
        ? await findWeatherContext(location).catch(() => undefined)
        : undefined;
      const places = location
        ? await findGooglePlaces(
            scenario.label,
            priority.id,
            location,
            advancedAnswers,
            excludedNames,
            userWish,
            weather
          ).catch(() => undefined)
        : undefined;
      // 주변 매장 데이터가 없으면 정적 목록으로 떨어지던 자리다.
      // 그 경로에서는 사용자가 적은 요청("고기 제외" 등)이 전혀 반영되지 않아
      // 정반대 결과가 나갔다. AI로 메뉴 후보를 먼저 만든다.
      const menuCandidates = places
        ? null
        : await generateCandidates(
            rawCategory,
            scenario.label,
            priority.label,
            budget.label,
            budget.maxWon,
            advancedContext,
            excludedNames,
            userWish,
            fallbacks
          );
      const recommendations = (
        places ||
        (menuCandidates?.live
          ? buildAiFoodRecommendations(
              menuCandidates.candidates,
              priority.label,
              budget.label,
              userWish,
              location
            )
          : buildFallbackFoodRecommendations(
              fallbacks,
              priority.label,
              budget.label,
              advancedContext,
              location
            ))
      ).slice(0, 4);
      const result = toAnalyzeResult(
        rawCategory,
        scenarioId,
        scenario.label,
        priority.id,
        priority.label,
        budgetId,
        budget.label,
        budget.maxWon,
        advancedAnswers.length,
        userWish,
        recommendations,
        {
          ai: menuCandidates?.live ? "live" : "fallback",
          price: "unavailable",
          places: places ? "live" : "unavailable",
          weather: weather ? "live" : "unavailable",
        },
        Boolean(location),
        [
          ...(userWish ? [`요청: ${userWish}`] : []),
          `${currentMealContext()} 시간대`,
          ...(weather ? [weather.summary] : []),
          ...(excludedNames.length > 0 ? ["최근 추천과 다른 후보 우선"] : []),
        ]
      );
      return NextResponse.json({ ok: true, ...result });
    }

    // 첫 요청부터 AI를 호출한다. 정적 폴백 상품명은 쿠팡 검색 정확도가 낮아
    // 제휴 전환이 사실상 일어나지 않는다.
    const generated = await generateCandidates(
      rawCategory,
      scenario.label,
      priority.label,
      budget.label,
      budget.maxWon,
      advancedContext,
      excludedNames,
      userWish,
      fallbacks
    );
    const resultCandidates = generated.candidates.slice(0, 4);
    const supportsShopping = ["gift", "appliance", "fashion"].includes(rawCategory);
    const priced = supportsShopping
      ? await enrichProductPrices(resultCandidates, budget.maxWon)
      : {
          recommendations: resultCandidates.map((item, index) => ({
            rank: index + 1,
            ...item,
            evidence:
              item.evidence || categoryEvidence(rawCategory, item.reason),
            // 고가·렌탈은 외부 판매 링크로 넘기지 않는다. 계약 조건이 개인마다
            // 달라 검색 결과로 넘기는 것이 오히려 잘못된 판단을 부른다.
            ...(isAdvisoryOnly(rawCategory)
              ? {}
              : {
                  sourceUrl: `https://search.naver.com/search.naver?query=${encodeURIComponent(
                    item.searchKeyword
                  )}`,
                  sourceLabel: "네이버에서 조건 확인",
                }),
          })),
          live: false,
        };
    const result = toAnalyzeResult(
      rawCategory,
      scenarioId,
      scenario.label,
      priority.id,
      priority.label,
      budgetId,
      budget.label,
      budget.maxWon,
      advancedAnswers.length,
      userWish,
      priced.recommendations,
      {
        ai: generated.live ? "live" : "fallback",
        price: priced.live ? "live" : "unavailable",
        places: "unavailable",
      },
      false
    );
    return NextResponse.json({ ok: true, ...result });
  } catch {
    const recommendations = (
      rawCategory === "food"
        ? buildFallbackFoodRecommendations(
            fallbacks,
            priority.label,
            budget.label,
            advancedContext,
            location
          )
        : buildFallbackNonFoodRecommendations(rawCategory, fallbacks)
    ).slice(0, 4);
    const result = toAnalyzeResult(
      rawCategory,
      scenarioId,
      scenario.label,
      priority.id,
      priority.label,
      budgetId,
      budget.label,
      budget.maxWon,
      advancedAnswers.length,
      userWish,
      recommendations,
      { ai: "fallback", price: "unavailable", places: "unavailable" },
      Boolean(location)
    );
    return NextResponse.json({ ok: true, ...result });
  }
}
