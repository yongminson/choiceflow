import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

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
};

type SelectionType = "best" | "value" | "reliable" | "premium";

type ValidAdvancedAnswer = {
  questionId: string;
  optionId: string;
  questionLabel: string;
  optionLabel: string;
};

type NaverShopItem = {
  title?: string;
  link?: string;
  lprice?: string;
  mallName?: string;
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
    partner: productFallback("gift", "연인 기념일 선물", ["향수", "가죽 카드지갑", "무드 조명"]),
    parents: productFallback("gift", "부모님 감사 선물", ["마사지기", "홍삼 선물세트", "전기포트"]),
    friend: productFallback("gift", "친구 생일 선물", ["텀블러", "블루투스 스피커", "핸드크림 세트"]),
    celebration: productFallback("gift", "집들이 선물", ["수건 세트", "디퓨저", "전기포트"]),
    child: productFallback("gift", "아이·조카 선물", ["블록 장난감", "아동 도서 세트", "키즈 운동화"]),
    business: productFallback("gift", "직장·비즈니스 선물", ["드립백 세트", "고급 볼펜", "핸드케어 세트"]),
  },
  appliance: {
    kitchen: productFallback("appliance", "주방가전", ["에어프라이어", "전기포트", "핸드블렌더"]),
    cleaning: productFallback("appliance", "청소 세탁 가전", ["무선청소기", "로봇청소기", "의류관리기"]),
    living: productFallback("appliance", "생활가전", ["공기청정기", "선풍기", "가습기"]),
    digital: productFallback("appliance", "디지털 가전", ["스마트 모니터", "태블릿", "블루투스 스피커"]),
    health: productFallback("appliance", "건강 뷰티 가전", ["헤어드라이어", "전기면도기", "마사지기"]),
    mobile: productFallback("appliance", "모바일 PC 기기", ["무선 이어폰", "모니터", "태블릿"]),
  },
  fashion: {
    work: productFallback("fashion", "출근 패션", ["옥스퍼드 셔츠", "슬랙스", "가죽 로퍼"]),
    couple: productFallback("fashion", "데이트 패션", ["니트 카디건", "미니 크로스백", "캐주얼 재킷"]),
    travel: productFallback("fashion", "여행 패션", ["경량 바람막이", "워킹화", "여행용 백팩"]),
    event: productFallback("fashion", "행사 모임 패션", ["블레이저", "원피스", "가죽 구두"]),
    daily: productFallback("fashion", "일상 기본 패션", ["기본 티셔츠", "데님 팬츠", "데일리 스니커즈"]),
    outdoor: productFallback("fashion", "운동 아웃도어 패션", ["러닝화", "경량 바람막이", "스포츠 백팩"]),
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
  };
}

function productFallback(
  categoryId: "gift" | "appliance" | "fashion",
  context: string,
  names: string[]
): Candidate[] {
  return names.map((name) => ({
    name,
    reason: `${context}에서 활용도와 가격 비교가 쉬운 후보예요.`,
    searchKeyword: name,
    qualitySummary: "후기 수와 최근 낮은 평점을 함께 확인하세요.",
    evidence: categoryEvidence(
      categoryId,
      `${context} 용도와 선택한 우선조건에 맞춰 비교한 후보예요.`
    ),
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
    {
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
  }));
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

async function generateCandidates(
  categoryId: CategoryId,
  scenarioLabel: string,
  priorityLabel: string,
  budgetLabel: string,
  maxBudgetWon: number | undefined,
  advancedContext: string,
  fallbacks: Candidate[]
): Promise<{ candidates: Candidate[]; live: boolean }> {
  const segmentedFallbacks = segmentFallbackCandidates(categoryId, fallbacks);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { candidates: segmentedFallbacks, live: false };

  const prompt = `당신은 한국 소비자의 선택을 돕는 구매·생활 의사결정 전문가다.
카테고리: ${QUICK_CATEGORY_LABELS[categoryId]}
상황: ${scenarioLabel}
최우선 조건: ${priorityLabel}
예산: ${budgetLabel}${maxBudgetWon ? ` (${maxBudgetWon.toLocaleString("ko-KR")}원 이하)` : ""}
정밀 조건: ${advancedContext || "추가 조건 없음"}

아래 목적별로 정확히 4개 후보를 추천하라.
- best: 전체 조건을 종합한 최종 선택
- value: 실제 구매비용과 유지비가 낮은 최저가·가성비 선택
- reliable: 이 카테고리에 맞는 실패 위험과 후기 신뢰성을 우선한 선택
- premium: 예산 범위 안에서 성능·소재·경험을 높인 프리미엄 선택

카테고리별 판단 규칙: ${categoryDecisionRules(categoryId)}
확인하지 않은 실시간 평점·후기 수·가격은 절대 만들지 않는다.
최우선 조건과 예산을 반드시 지키고, 서로 다른 유형을 검토한 뒤 검색 가능한 구체적인 일반 상품명
또는 선택지로 작성한다. 상품명은 브랜드 광고 문구나 옵션을 붙이지 말고 24자 안의
일반적인 검색어로 쓴다. 여러 상품을 쉼표로 연결하지 않는다.

JSON 배열만 응답:
[{"selectionType":"best|value|reliable|premium","name":"","reason":"","searchKeyword":"","qualitySummary":"","asSummary":"","depreciationSummary":""}]`;

  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model:
        process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
    });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const parsed = JSON.parse(result.response.text()) as unknown;
    if (!Array.isArray(parsed)) {
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
  } catch {
    return { candidates: segmentedFallbacks, live: false };
  }
}

async function findNaverLowestPrice(
  query: string,
  maxBudgetWon?: number
): Promise<NaverShopItem | undefined> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return undefined;

  const url = new URL("https://openapi.naver.com/v1/search/shop.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "10");
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("exclude", "used:rental:cbshop");

  const response = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return undefined;
  const payload = (await response.json()) as { items?: NaverShopItem[] };
  return payload.items?.find((item) => {
    const price = Number(item.lprice);
    return price > 0 && (!maxBudgetWon || price <= maxBudgetWon);
  });
}

async function enrichProductPrices(
  candidates: Candidate[],
  maxBudgetWon?: number
): Promise<{ recommendations: QuickRecommendation[]; live: boolean }> {
  const items: QuickRecommendation[] = await Promise.all(
    candidates.map(async (candidate, index): Promise<QuickRecommendation> => {
      const searchKeyword = normalizeProductSearchKeyword(
        candidate.searchKeyword,
        candidate.name
      );
      try {
        const product = await findNaverLowestPrice(
          searchKeyword,
          maxBudgetWon
        );
        const price = Number(product?.lprice);
        return {
          rank: index + 1,
          ...candidate,
          searchKeyword,
          price: Number.isFinite(price) && price > 0 ? price : undefined,
          priceLabel:
            Number.isFinite(price) && price > 0
              ? "네이버 조회 참고가 · 쿠팡 가격은 이동 후 확인"
              : undefined,
          seller: clean(product?.mallName, "", 80) || undefined,
          sourceUrl: buildDirectCoupangNpSearchUrl(searchKeyword),
          sourceLabel: "쿠팡에서 이 상품 검색",
          name: candidate.name,
        } satisfies QuickRecommendation;
      } catch {
        return {
          rank: index + 1,
          ...candidate,
          searchKeyword,
          sourceUrl: buildDirectCoupangNpSearchUrl(searchKeyword),
          sourceLabel: "쿠팡에서 이 상품 검색",
        } satisfies QuickRecommendation;
      }
    })
  );
  const sorted = [...items]
    .sort(
      (a, b) =>
        SELECTION_ORDER.indexOf(a.selectionType || "best") -
        SELECTION_ORDER.indexOf(b.selectionType || "best")
    )
    .map((item, index) => ({ ...item, rank: index + 1 }));
  return {
    recommendations: sorted,
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
        textQuery: `${weather?.searchHint || ""} restaurants ${searchDetails}`
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
  const selected = SELECTION_ORDER.slice(0, 3).map((selectionType) => {
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

function buildFallbackFoodRecommendations(
  candidates: Candidate[],
  priorityLabel: string,
  budgetLabel: string,
  advancedContext = ""
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
    sourceUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      item.searchKeyword
    )}`,
    sourceLabel: "Google 지도에서 이 메뉴 주변 검색",
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
    sourceUrl: shopping
      ? buildDirectCoupangNpSearchUrl(
          normalizeProductSearchKeyword(item.searchKeyword, item.name)
        )
      : `https://search.naver.com/search.naver?query=${encodeURIComponent(
          item.searchKeyword
        )}`,
    sourceLabel: shopping
      ? "쿠팡에서 가격 확인"
      : "네이버에서 조건 확인",
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
  recommendations: QuickRecommendation[],
  status: AnalyzeApiResult["providerStatus"],
  locationUsed: boolean,
  recommendationContext: string[] = []
): AnalyzeApiResult {
  const limitedRecommendations = recommendations.slice(0, 3);
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
    quickMaxBudgetWon: maxBudgetWon,
    quickCandidateCount: limitedRecommendations.length,
    refinementAnswerCount,
    quickRecommendations: limitedRecommendations,
    providerStatus: status,
    locationUsed,
    recommendationContext,
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
  const excludedNames = readExcludedNames(body.excludedNames);

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
            weather
          ).catch(() => undefined)
        : undefined;
      const recommendations = (
        places ||
        buildFallbackFoodRecommendations(
          fallbacks,
          priority.label,
          budget.label,
          advancedContext
        )
      ).slice(0, 3);
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
        recommendations,
        {
          ai: "fallback",
          price: "unavailable",
          places: places ? "live" : "unavailable",
          weather: weather ? "live" : "unavailable",
        },
        Boolean(location),
        [
          `${currentMealContext()} 시간대`,
          ...(weather ? [weather.summary] : []),
          ...(excludedNames.length > 0 ? ["최근 추천과 다른 후보 우선"] : []),
        ]
      );
      return NextResponse.json({ ok: true, ...result });
    }

    const generated =
      advancedAnswers.length > 0
        ? await generateCandidates(
            rawCategory,
            scenario.label,
            priority.label,
            budget.label,
            budget.maxWon,
            advancedContext,
            fallbacks
          )
        : {
            candidates: segmentFallbackCandidates(rawCategory, fallbacks),
            live: false,
          };
    const resultCandidates = generated.candidates.slice(0, 3);
    const supportsShopping = ["gift", "appliance", "fashion"].includes(rawCategory);
    const priced = supportsShopping
      ? advancedAnswers.length > 0
        ? await enrichProductPrices(
            resultCandidates,
            budget.maxWon
          )
        : {
            recommendations: resultCandidates.map((item, index) => ({
              rank: index + 1,
              ...item,
              searchKeyword: normalizeProductSearchKeyword(
                item.searchKeyword,
                item.name
              ),
              evidence:
                item.evidence || categoryEvidence(rawCategory, item.reason),
              sourceUrl: buildDirectCoupangNpSearchUrl(
                normalizeProductSearchKeyword(item.searchKeyword, item.name)
              ),
              sourceLabel: "쿠팡에서 이 상품 검색",
            })),
            live: false,
          }
      : {
          recommendations: resultCandidates.map((item, index) => ({
            rank: index + 1,
            ...item,
            sourceUrl: `https://search.naver.com/search.naver?query=${encodeURIComponent(
              item.searchKeyword
            )}`,
            sourceLabel: "네이버에서 조건 확인",
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
            advancedContext
          )
        : buildFallbackNonFoodRecommendations(rawCategory, fallbacks)
    ).slice(0, 3);
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
      recommendations,
      { ai: "fallback", price: "unavailable", places: "unavailable" },
      Boolean(location)
    );
    return NextResponse.json({ ok: true, ...result });
  }
}
