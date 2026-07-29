import type { CategoryId } from "@/lib/types/category";

export type QuickScenario = {
  id: string;
  label: string;
  description: string;
};

export type QuickPriorityId =
  | "price"
  | "performance"
  | "design"
  | "convenience";

export type QuickPriority = {
  id: QuickPriorityId;
  label: string;
  description: string;
};

export type QuickBudget = {
  id: string;
  label: string;
  description: string;
  maxWon?: number;
};

export type QuickAdvancedOption = {
  id: string;
  label: string;
};

export type QuickAdvancedQuestion = {
  id: string;
  label: string;
  description: string;
  options: QuickAdvancedOption[];
};

export const QUICK_CATEGORY_LABELS: Record<CategoryId, string> = {
  food: "음식",
  gift: "선물",
  appliance: "가전",
  fashion: "패션",
  date: "여행·데이트",
  asset: "렌탈·큰 지출",
};

export const QUICK_CATEGORY_DESCRIPTION: Record<CategoryId, string> = {
  food: "지금 먹을 메뉴와 주변 맛집",
  gift: "관계와 상황에 맞는 선물",
  appliance: "생활가전과 디지털 제품",
  fashion: "옷·신발·가방과 스타일",
  date: "데이트·나들이·여행 정보",
  asset: "렌탈·자동차·보험·주거",
};

export const QUICK_SCENARIOS: Record<CategoryId, QuickScenario[]> = {
  food: [
    { id: "solo", label: "혼밥", description: "빠르고 부담 없는 한 끼" },
    { id: "couple", label: "데이트", description: "분위기와 후기가 좋은 곳" },
    { id: "group", label: "친구·회식", description: "여럿이 먹기 편한 곳" },
    { id: "family", label: "가족", description: "호불호 적고 편안한 곳" },
    { id: "delivery", label: "배달·야식", description: "가격과 배달 만족도 중심" },
    { id: "healthy", label: "건강식", description: "가볍고 균형 잡힌 메뉴" },
  ],
  gift: [
    { id: "partner", label: "연인 기념일", description: "기억에 남는 선물" },
    { id: "parents", label: "부모님 감사", description: "실용성과 신뢰 우선" },
    { id: "friend", label: "친구 생일", description: "센스 있고 부담 없이" },
    { id: "celebration", label: "집들이·축하", description: "누구나 쓰기 좋은 선물" },
    { id: "child", label: "아이·조카", description: "연령과 안전성을 고려" },
    { id: "business", label: "직장·비즈니스", description: "부담 없고 격식 있게" },
  ],
  appliance: [
    { id: "kitchen", label: "주방가전", description: "관리와 A/S까지 비교" },
    { id: "cleaning", label: "청소·세탁", description: "성능과 유지비 중심" },
    { id: "living", label: "계절·생활", description: "전기료와 내구성 중심" },
    { id: "digital", label: "TV·디지털", description: "성능과 감가까지 고려" },
    { id: "health", label: "건강·뷰티", description: "안전성과 관리 편의 중심" },
    { id: "mobile", label: "모바일·PC", description: "호환성과 성능 중심" },
  ],
  fashion: [
    { id: "work", label: "출근", description: "활용도와 관리 편의" },
    { id: "couple", label: "데이트", description: "인상과 후기 중심" },
    { id: "travel", label: "여행", description: "편안함과 내구성" },
    { id: "event", label: "행사·모임", description: "격식과 재활용도" },
    { id: "daily", label: "일상·기본", description: "자주 입는 활용도 중심" },
    { id: "outdoor", label: "운동·아웃도어", description: "기능과 내구성 중심" },
  ],
  date: [
    { id: "restaurant", label: "맛집", description: "평점과 후기 좋은 곳" },
    { id: "indoor", label: "실내", description: "날씨 걱정 없는 코스" },
    { id: "outdoor", label: "야외·활동", description: "함께 즐기는 체험" },
    { id: "trip", label: "휴식·여행", description: "비용 대비 만족도" },
    { id: "family", label: "가족 나들이", description: "연령대와 이동 편의 고려" },
    { id: "stay", label: "숙소·교통", description: "예약 조건과 총비용 비교" },
  ],
  asset: [
    { id: "car", label: "자동차", description: "감가와 유지비 중심" },
    { id: "property", label: "부동산", description: "리스크와 환금성 중심" },
    { id: "rental", label: "렌탈", description: "총비용과 해지 조건" },
    { id: "insurance", label: "보험", description: "보장과 중복 위험" },
    { id: "subscription", label: "통신·구독", description: "월 총비용과 해지 조건" },
    { id: "business", label: "사무·장비", description: "구매와 렌탈 총비용 비교" },
  ],
};

const DEFAULT_PRIORITIES: QuickPriority[] = [
  { id: "price", label: "가격", description: "최종 지출을 가장 낮게" },
  { id: "performance", label: "성능", description: "돈보다 품질과 기능 우선" },
  { id: "design", label: "디자인", description: "외관과 분위기를 중요하게" },
  { id: "convenience", label: "편리함", description: "관리와 사용이 쉬운 선택" },
];

export const QUICK_PRIORITIES: Record<CategoryId, QuickPriority[]> = {
  food: [
    { id: "price", label: "가격", description: "한 끼 지출을 가장 낮게" },
    { id: "performance", label: "맛·후기", description: "평점과 후기 신뢰도 우선" },
    { id: "design", label: "분위기", description: "공간과 인상을 중요하게" },
    { id: "convenience", label: "가까움", description: "이동과 대기 부담을 적게" },
  ],
  gift: DEFAULT_PRIORITIES,
  appliance: DEFAULT_PRIORITIES,
  fashion: DEFAULT_PRIORITIES,
  date: [
    { id: "price", label: "가격", description: "전체 비용을 가장 낮게" },
    { id: "performance", label: "경험", description: "후기와 만족도 우선" },
    { id: "design", label: "분위기", description: "사진과 공간을 중요하게" },
    { id: "convenience", label: "동선", description: "예약과 이동을 간단하게" },
  ],
  asset: [
    { id: "price", label: "총비용", description: "구매·유지비를 모두 낮게" },
    { id: "performance", label: "안정성", description: "품질과 위험 관리 우선" },
    { id: "design", label: "가치 유지", description: "감가와 재판매까지 고려" },
    { id: "convenience", label: "관리 편의", description: "계약과 유지 부담을 적게" },
  ],
};

export const QUICK_ADVANCED_QUESTIONS: Record<
  CategoryId,
  QuickAdvancedQuestion[]
> = {
  food: [
    {
      id: "distance",
      label: "얼마나 가까워야 하나요?",
      description: "이동 가능한 범위를 골라주세요.",
      options: [
        { id: "walk", label: "도보 10분" },
        { id: "near", label: "차량 15분" },
        { id: "any", label: "거리 상관없음" },
      ],
    },
    {
      id: "waiting",
      label: "대기는 어느 정도 괜찮나요?",
      description: "기다리는 시간을 반영할게요.",
      options: [
        { id: "none", label: "바로 입장" },
        { id: "short", label: "20분까지" },
        { id: "any", label: "맛있다면 상관없음" },
      ],
    },
    {
      id: "diet",
      label: "피하고 싶은 음식이 있나요?",
      description: "가장 가까운 조건을 선택하세요.",
      options: [
        { id: "none", label: "없음" },
        { id: "spicy", label: "매운 음식" },
        { id: "meat", label: "고기류" },
        { id: "carb", label: "고탄수 메뉴" },
      ],
    },
    {
      id: "service",
      label: "어떤 방식이 편한가요?",
      description: "이용 형태를 선택하세요.",
      options: [
        { id: "dine", label: "매장 식사" },
        { id: "takeout", label: "포장" },
        { id: "delivery", label: "배달" },
      ],
    },
    {
      id: "review",
      label: "후기는 무엇을 더 볼까요?",
      description: "평점과 후기 중 더 믿는 기준이에요.",
      options: [
        { id: "rating", label: "높은 평점" },
        { id: "volume", label: "후기 개수" },
        { id: "recent", label: "최근 후기" },
      ],
    },
  ],
  gift: [
    advanced("taste", "받는 분의 취향은?", "취향 반영 정도를 선택하세요.", ["실용적", "감성적", "취미 중심", "잘 모르겠음"]),
    advanced("frequency", "얼마나 자주 쓸 선물인가요?", "사용 빈도를 고려할게요.", ["매일", "가끔", "기념용"]),
    advanced("brand", "브랜드가 중요한가요?", "브랜드 선호 수준을 골라주세요.", ["매우 중요", "어느 정도", "상관없음"]),
    advanced("delivery", "언제까지 필요하나요?", "배송 가능 여부를 반영할게요.", ["오늘·내일", "3일 안", "일주일 이상"]),
    advanced("exchange", "교환 편의가 중요한가요?", "사이즈·취향 실패 위험을 줄여요.", ["매우 중요", "보통", "상관없음"]),
  ],
  appliance: [
    advanced("brand", "선호 브랜드가 있나요?", "브랜드 범위를 선택하세요.", ["국내 대기업", "가성비 브랜드", "상관없음"]),
    advanced("frequency", "얼마나 자주 사용하나요?", "내구성과 성능 기준을 조절해요.", ["매일", "주 2~3회", "가끔"]),
    advanced("space", "설치 공간은 어떤가요?", "제품 크기를 결정하는 조건이에요.", ["좁음", "보통", "넉넉함"]),
    advanced("as", "A/S는 얼마나 중요한가요?", "서비스망과 보증을 반영할게요.", ["매우 중요", "보통", "가격이 더 중요"]),
    advanced("maintenance", "소모품·관리비를 볼까요?", "구매 후 비용까지 계산해요.", ["최소화", "적당하면 됨", "성능이 더 중요"]),
  ],
  fashion: [
    advanced("fit", "선호하는 핏은?", "실루엣 기준을 선택하세요.", ["슬림", "기본", "여유로운 핏"]),
    advanced("frequency", "얼마나 자주 착용하나요?", "내구성과 활용도를 반영해요.", ["매일", "주말·외출", "특별한 날"]),
    advanced("care", "관리는 얼마나 간편해야 하나요?", "세탁과 보관 부담을 고려해요.", ["세탁기 가능", "드라이 가능", "상관없음"]),
    advanced("brand", "브랜드가 중요한가요?", "브랜드와 소재 비중을 정해요.", ["매우 중요", "어느 정도", "상관없음"]),
    advanced("season", "언제 주로 입나요?", "계절과 소재를 맞출게요.", ["봄·가을", "여름", "겨울", "사계절"]),
  ],
  date: [
    advanced("party", "누구와 함께하나요?", "동행자에 맞는 선택을 해요.", ["연인", "친구", "가족", "혼자"]),
    advanced("duration", "사용 가능한 시간은?", "동선과 일정 길이를 정해요.", ["2시간", "반나절", "하루", "1박 이상"]),
    advanced("mobility", "이동 수단은?", "접근성과 주차를 고려해요.", ["도보·대중교통", "자가용", "상관없음"]),
    advanced("reservation", "예약이 괜찮나요?", "즉흥성과 확정성을 조절해요.", ["예약 필수도 괜찮음", "당일 가능", "예약 없는 곳"]),
    advanced("cancel", "취소 조건이 중요한가요?", "일정 변경 위험을 반영해요.", ["무료 취소 필수", "일부 수수료 가능", "상관없음"]),
  ],
  asset: [
    advanced("period", "얼마나 오래 사용할 예정인가요?", "총비용과 감가 계산에 필요해요.", ["1년 이하", "2~3년", "5년 이상"]),
    advanced("contract", "중도해지 가능성이 있나요?", "해지 비용 위험을 반영해요.", ["높음", "낮음", "잘 모르겠음"]),
    advanced("maintenance", "유지·관리 부담은?", "월 비용과 시간을 함께 봐요.", ["최소화", "보통", "성능이 더 중요"]),
    advanced("resale", "중고 처분 가능성이 중요한가요?", "환금성과 감가를 고려해요.", ["매우 중요", "보통", "상관없음"]),
    advanced("warranty", "보증과 A/S는 얼마나 중요한가요?", "계약 이후 위험을 줄여요.", ["매우 중요", "보통", "가격이 더 중요"]),
  ],
};

function advanced(
  id: string,
  label: string,
  description: string,
  labels: string[]
): QuickAdvancedQuestion {
  return {
    id,
    label,
    description,
    options: labels.map((optionLabel, index) => ({
      id: `option-${index + 1}`,
      label: optionLabel,
    })),
  };
}

const anyBudget = (description = "가격보다 적합성을 우선") => ({
  id: "any",
  label: "상관없음",
  description,
});

const budgets = (
  first: QuickBudget,
  second: QuickBudget,
  anyDescription?: string
): QuickBudget[] => [first, second, anyBudget(anyDescription)];

export function getQuickBudgets(
  categoryId: CategoryId,
  scenarioId: string
): QuickBudget[] {
  if (categoryId === "food") {
    return budgets(
      { id: "under-10000", label: "1만 원 이하", description: "1인 기준", maxWon: 10_000 },
      { id: "under-30000", label: "3만 원 이하", description: "1인 기준", maxWon: 30_000 }
    );
  }
  if (categoryId === "gift") {
    return budgets(
      { id: "under-50000", label: "5만 원 이하", description: "부담 없는 선물", maxWon: 50_000 },
      { id: "under-100000", label: "10만 원 이하", description: "선택 폭을 넓게", maxWon: 100_000 }
    );
  }
  if (categoryId === "fashion") {
    return budgets(
      { id: "under-50000", label: "5만 원 이하", description: "기본 아이템 중심", maxWon: 50_000 },
      { id: "under-200000", label: "20만 원 이하", description: "소재와 브랜드까지", maxWon: 200_000 }
    );
  }
  if (categoryId === "date") {
    return budgets(
      { id: "under-50000", label: "5만 원 이하", description: "1인 예상 비용", maxWon: 50_000 },
      { id: "under-200000", label: "20만 원 이하", description: "1인 예상 비용", maxWon: 200_000 }
    );
  }
  if (categoryId === "appliance") {
    const premium =
      scenarioId === "cleaning" ||
      scenarioId === "digital" ||
      scenarioId === "mobile";
    return premium
      ? budgets(
          { id: "under-500000", label: "50만 원 이하", description: "가성비 모델 중심", maxWon: 500_000 },
          { id: "under-1500000", label: "150만 원 이하", description: "상위 제품까지", maxWon: 1_500_000 }
        )
      : budgets(
          { id: "under-100000", label: "10만 원 이하", description: "필수 기능 중심", maxWon: 100_000 },
          { id: "under-500000", label: "50만 원 이하", description: "성능과 내구성까지", maxWon: 500_000 }
        );
  }

  if (scenarioId === "car") {
    return budgets(
      { id: "under-20000000", label: "2천만 원 이하", description: "취득가 기준", maxWon: 20_000_000 },
      { id: "under-40000000", label: "4천만 원 이하", description: "취득가 기준", maxWon: 40_000_000 }
    );
  }
  if (scenarioId === "property") {
    return budgets(
      { id: "under-100000000", label: "1억 원 이하", description: "가용 자금 기준", maxWon: 100_000_000 },
      { id: "under-300000000", label: "3억 원 이하", description: "가용 자금 기준", maxWon: 300_000_000 }
    );
  }
  return budgets(
    { id: "under-50000", label: "월 5만 원 이하", description: "월 납입액 기준", maxWon: 50_000 },
    { id: "under-100000", label: "월 10만 원 이하", description: "월 납입액 기준", maxWon: 100_000 },
    "비용보다 계약 조건 우선"
  );
}

export function getQuickScenario(categoryId: CategoryId, scenarioId: string) {
  return QUICK_SCENARIOS[categoryId].find((scenario) => scenario.id === scenarioId);
}

export function getQuickPriority(
  categoryId: CategoryId,
  priorityId: string
) {
  return QUICK_PRIORITIES[categoryId].find(
    (priority) => priority.id === priorityId
  );
}

export function getQuickBudget(
  categoryId: CategoryId,
  scenarioId: string,
  budgetId: string
) {
  return getQuickBudgets(categoryId, scenarioId).find(
    (budget) => budget.id === budgetId
  );
}

export function getQuickAdvancedQuestions(categoryId: CategoryId) {
  return QUICK_ADVANCED_QUESTIONS[categoryId];
}

export function getQuickAdvancedAnswer(
  categoryId: CategoryId,
  questionId: string,
  optionId: string
) {
  const question = QUICK_ADVANCED_QUESTIONS[categoryId].find(
    (item) => item.id === questionId
  );
  const option = question?.options.find((item) => item.id === optionId);
  return question && option ? { question, option } : undefined;
}
