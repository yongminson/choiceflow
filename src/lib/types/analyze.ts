export type AnalyzeOptionTable = {
  pros: string[];
  cons: string[];
};

/** AI 모델이 반환하는 핵심 JSON (API 라우트에서 검증) */
export type AnalyzeResponse = {
  winner: "A" | "B";
  winnerName: string;
  score: number;
  winPercentage?: number;
  regretProbability?: number;
  realReviews?: string[];
  comparisonMetrics?: {
    label: string;
    a: number;
    b: number;
  }[];
  optionC?: {
    name: string;
    reason: string;
    searchKeyword: string;
  };
  table: {
    A: { pros: string[]; cons: string[] };
    B: { pros: string[]; cons: string[] };
  };
  sajuSynergy?: string;
  killerInsight: string;
  summary: string;
  analysisText: string;
  searchKeyword: string | null;
};

/**
 * 클라이언트에 내려가는 최종 페이로드 — 서버가 요청의 옵션명·예산 등을 합친 값.
 * sessionStorage `choiceResult`에 저장됩니다.
 */
export type AnalyzeApiResult = AnalyzeResponse & {
  optionALabel: string;
  optionBLabel: string;
  /** A·B 예상가(만 원) — 표시용 */
  priceAManwon: number;
  priceBManwon: number;
  /** 참고용 평균(만 원) — 레거시·요약용 */
  budgetManwon: number;
  categoryId?: string;
  /** 홈 폼에서 「명운 사주 연동」 체크 여부 — 프리미엄 리포트 표시에 사용 */
  myeongunDeepDataEnabled?: boolean;
  recommendationMode?: "quick" | "compare";
  quickScenarioLabel?: string;
  quickPriorityLabel?: string;
  quickBudgetLabel?: string;
  quickMaxBudgetWon?: number;
  quickCandidateCount?: number;
  quickScenarioId?: string;
  quickPriorityId?: string;
  quickBudgetId?: string;
  /** 사용자가 직접 입력한 요청 ("매운 국물", "향수 말고") */
  quickUserWish?: string;
  refinementAnswerCount?: number;
  quickRecommendations?: QuickRecommendation[];
  providerStatus?: {
    ai: "live" | "fallback";
    price: "live" | "unavailable";
    places: "live" | "unavailable";
    weather?: "live" | "unavailable";
  };
  locationUsed?: boolean;
  recommendationContext?: string[];
  /** 외부 연결 없이 판단만 제공하는 카테고리(고가·렌탈)의 마무리 조언 */
  advisory?: string;
  checkedAt?: string;
};

export type RecommendationEvidence = {
  label: string;
  text: string;
  kind?: "verified" | "guide" | "caution";
};

/** AI가 매긴 후보 간 상대 평가 축. 절대 수치가 아니라 비교용이다. */
export type RecommendationScore = {
  label: string;
  /** 0~100. 같은 조건에서 후보끼리 비교한 상대값 */
  value: number;
};

/**
 * 후보가 내 조건을 지켰는지 한 줄씩 표시하는 체크 항목.
 *
 * 줄글 이유는 읽는 데 시간이 걸려 결국 "그래서 사도 되나"가 남는다.
 * 조건 단위로 쪼개서 충족/미달을 눈으로 세게 만든다.
 */
export type RecommendationFitCheck = {
  /** true면 조건을 지킴, false면 감수해야 하는 부분 */
  ok: boolean;
  /** "예산 안에 들어옴" 처럼 조건을 그대로 확인해 주는 짧은 문장 */
  text: string;
};

export type QuickRecommendation = {
  rank: number;
  name: string;
  reason: string;
  searchKeyword: string;
  qualitySummary: string;
  asSummary?: string;
  depreciationSummary?: string;
  price?: number;
  priceLabel?: string;
  seller?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  priceLevel?: string;
  selectionType?: "best" | "value" | "reliable" | "premium";
  selectionLabel?: string;
  evidence?: RecommendationEvidence[];
  distanceMeters?: number;
  openNow?: boolean;
  dataStatus?: "verified-place" | "category-guide";
  /** 쿠팡 상품 썸네일 */
  imageUrl?: string;
  /** 쿠팡에 실제로 등록된 상품명 */
  productName?: string;
  /** 로켓배송 여부 */
  isRocket?: boolean;
  /** 조건 전체를 종합한 적합도 0~100 — 메인 그래프에 쓴다 */
  overall?: number;
  /** 세부 축별 상대 점수 — 카드 안에 보조로 표시한다 */
  scores?: RecommendationScore[];
  /** 내 조건을 지켰는지 항목별로 끊어 보여주는 체크리스트 */
  fitChecks?: RecommendationFitCheck[];
};

/** POST /api/analyze 성공 시 본문 — 항상 JSON 객체 */
export type AnalyzeApiSuccessEnvelope = AnalyzeApiResult & { ok: true };

/** POST /api/analyze 실패 시 본문 — 항상 JSON 객체 */
export type AnalyzeApiErrorBody = {
  ok: false;
  error?: string;
  /** AI 가드레일: 비교와 무관한 입력 — 크레딧 미차감 */
  status?: "REJECTED";
  reason?: string;
  raw?: string;
};

export type AnalyzeRequestBody = {
  optionA: string;
  optionB: string;
  priceAManwon: number;
  priceBManwon: number;
  /** 나의 현재 상황 및 고민의 이유 (필수) */
  situationReason: string;
  /** 참고용 (평균 등) — 선택 */
  budgetManwon?: number;
  usagePeriod: string;
  priority: string;
  /** true면 입력 검증만 수행하고 분석은 하지 않음 */
  validateOnly?: boolean;
  /** 카테고리 맥락 (선물·가전·패션·데이트·자산 등) */
  categoryId?: string;
  /** 카테고리 한글 라벨 (프롬프트 보강용, 선택) */
  category?: string;
  /** 나머지 폼·메모 JSON 등 추가 맥락 */
  contextNotes?: string;
  /** 사용자 추가 메모 (선택) */
  extraContext?: string;
  /** 명운(사주) 심층 연동 요청 여부 */
  myeongunDeepDataEnabled?: boolean;
  /**
   * 홈&가전(appliance) 전용 — 프리미엄 공간 분석 ON이면 크레딧 2, OFF면 1.
   * 다른 카테고리에서는 무시됩니다.
   */
  isPremium?: boolean;
  /**
   * 비교에 첨부한 이미지 — Data URL(`data:image/...;base64,...`) 문자열 배열.
   * 없으면 빈 배열.
   */
  images?: string[];
};

export type AnalyzeValidateOk = { ok: true };
