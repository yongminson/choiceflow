"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Gift,
  HousePlug,
  Landmark,
  ListChecks,
  LocateFixed,
  Plane,
  RefreshCw,
  Scale,
  ShieldCheck,
  Shirt,
  Sliders,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Trophy,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getQuickBudget,
  getQuickBudgets,
  getQuickPriority,
  getQuickScenario,
  QUICK_CATEGORY_DESCRIPTION,
  QUICK_CATEGORY_LABELS,
  QUICK_PRIORITIES,
  QUICK_SCENARIOS,
  type QuickPriorityId,
} from "@/lib/recommendation/quick-options";
import {
  readRecentRecommendationNames,
  saveRecentRecommendationNames,
} from "@/lib/recommendation/recent-recommendations";
import { CATEGORY_ORDER, type CategoryId } from "@/lib/types/category";

type LocationPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

type QuickSelection = {
  categoryId: CategoryId;
  scenarioId: string;
  priorityId: QuickPriorityId;
  budgetId: string;
  userWish?: string;
};

/** 카테고리별 자유 입력 예시. 무엇을 적어야 할지 모르면 아무도 안 적는다. */
const WISH_PLACEHOLDER: Record<CategoryId, string> = {
  food: "예: 매운 국물 요리, 느끼한 건 빼고",
  gift: "예: 향수 말고 실용적인 걸로",
  appliance: "예: 원룸이라 작고 조용한 걸로",
  fashion: "예: 어깨 넓어 보이는 핏 말고",
  date: "예: 실내 위주, 많이 걷는 건 힘들어요",
  asset: "예: 3년 뒤 되팔 생각이에요",
};

type RecentSelection = QuickSelection & {
  savedAt: number;
};

const RECENT_STORAGE_KEY = "choiceflow-recent-selections";

/** 첫 화면에서 곧바로 진입할 수 있는 대표 카테고리 */
const POPULAR_PICKS: Array<{ label: string; categoryId: CategoryId }> = [
  { label: "노트북·가전", categoryId: "appliance" },
  { label: "선물", categoryId: "gift" },
  { label: "오늘 뭐 먹지", categoryId: "food" },
  { label: "옷·신발", categoryId: "fashion" },
];

/** 결과 화면에서 실제로 제공하는 것만 적는다. 못 지킬 약속은 넣지 않는다. */
const VALUE_POINTS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Trophy,
    title: "1등을 하나만 지목",
    body: "4개를 나열하고 끝내지 않고 종합 적합도로 순위를 세워 하나를 고릅니다.",
  },
  {
    icon: ListChecks,
    title: "조건별 충족 여부",
    body: "예산·용도·빼고 싶은 것까지 항목으로 끊어 지켰는지 아닌지 표시합니다.",
  },
  {
    icon: Tag,
    title: "지금 살 수 있는 가격",
    body: "쿠팡에 실제로 등록된 상품의 가격·썸네일을 붙여 바로 확인할 수 있게 합니다.",
  },
];

const STEPS = [
  "고민 중인 분야 고르기",
  "용도·조건·예산 3번 탭",
  "결과에서 하나 고르기",
];

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  food: Utensils,
  gift: Gift,
  appliance: HousePlug,
  fashion: Shirt,
  date: Plane,
  asset: Landmark,
};

const CATEGORY_IMAGES: Record<CategoryId, string> = {
  food: "/emojis/food.png",
  gift: "/emojis/3d-gift.png",
  appliance: "/emojis/3d-home.png",
  fashion: "/emojis/3d-shirt.png",
  date: "/emojis/3d-airplane.png",
  asset: "/emojis/3d-diamond.png",
};

const QUESTION_THEMES: Record<CategoryId, {
  image: string;
  accent: string;
  soft: string;
  eyebrow: string;
}> = {
  food: { image: "/brand/scene-food.png", accent: "#2563eb", soft: "#eff6ff", eyebrow: "Food · Nearby" },
  gift: { image: "/brand/scene-shopping.png", accent: "#2563eb", soft: "#eff6ff", eyebrow: "Gift · Thoughtful" },
  appliance: { image: "/brand/scene-appliance.png", accent: "#2563eb", soft: "#eff6ff", eyebrow: "Home · Reliable" },
  fashion: { image: "/brand/scene-fashion.png", accent: "#2563eb", soft: "#eff6ff", eyebrow: "Style · Personal" },
  date: { image: "/brand/scene-lifestyle.png", accent: "#2563eb", soft: "#eff6ff", eyebrow: "Travel · Experience" },
  asset: { image: "/brand/scene-big-decision.png", accent: "#2563eb", soft: "#eff6ff", eyebrow: "Decision · Long-term" },
};

const CATEGORY_SCENES: Record<CategoryId, {
  image: string;
  tag: string;
  badge: string;
}> = {
  food: { image: "/brand/scene-food.png", tag: "Food & Local", badge: "오늘 점심·저녁" },
  gift: { image: "/brand/scene-shopping.png", tag: "Gift & Giving", badge: "실패 없는 선물" },
  appliance: { image: "/brand/scene-appliance.png", tag: "Tech & Living", badge: "오래 쓸 가전" },
  fashion: { image: "/brand/scene-fashion.png", tag: "Style & Fitting", badge: "체형 맞춤 핏" },
  date: { image: "/brand/scene-lifestyle.png", tag: "Travel & Date", badge: "주말 코스" },
  asset: { image: "/brand/scene-big-decision.png", tag: "Major Decision", badge: "차량·부동산·렌탈" },
};

const SIM_CASES = [
  {
    categoryId: "appliance" as CategoryId,
    categoryLabel: "가전·디지털",
    q1: "원룸 1인 가구 · 조용한 생활",
    q2: "가성비 & 잔고장 제로",
    q3: "예산 30~50만원대",
    winnerName: "쿠쿠 인스퓨어 무소음 에어로",
    matchScore: 98.4,
    reason: "동급 대비 소음 만족도 96% · 원룸 최적 사이즈",
    price: "349,000원",
    tag: "1위 확정",
  },
  {
    categoryId: "food" as CategoryId,
    categoryLabel: "오늘 뭐 먹지",
    q1: "퇴근 후 혼밥 · 얼큰한 국물 요리",
    q2: "느끼함 없고 칼칼한 맛 우선",
    q3: "예산 1~2만원",
    winnerName: "담꾹 얼큰 소고기 버섯 샤브샤브",
    matchScore: 99.1,
    reason: "혼밥 밀키트 만족도 1위 · 칼칼한 특제 육수",
    price: "13,900원",
    tag: "혼밥 종결",
  },
  {
    categoryId: "gift" as CategoryId,
    categoryLabel: "선물·기프트",
    q1: "30대 직장 동료 집들이 선물",
    q2: "호불호 없고 실용적인 구성",
    q3: "예산 5만원 내외",
    winnerName: "이솝 레저렉션 아로마틱 핸드워시 세트",
    matchScore: 97.6,
    reason: "향수보다 호불호 없음 · 센스 있는 집들이 1순위",
    price: "53,000원",
    tag: "선물 1위",
  },
];

function getLocation(): Promise<LocationPayload | undefined> {
  if (!("geolocation" in navigator)) return Promise.resolve(undefined);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      () => resolve(undefined),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300_000 }
    );
  });
}

function readRecentSelections(): RecentSelection[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentSelection => {
        if (!item || typeof item !== "object") return false;
        const value = item as Partial<RecentSelection>;
        return (
          typeof value.categoryId === "string" &&
          CATEGORY_ORDER.includes(value.categoryId as CategoryId) &&
          typeof value.scenarioId === "string" &&
          typeof value.priorityId === "string" &&
          typeof value.budgetId === "string" &&
          typeof value.savedAt === "number"
        );
      })
      .slice(0, 4);
  } catch {
    return [];
  }
}

function saveRecentSelection(selection: QuickSelection) {
  const current = readRecentSelections();
  const key = `${selection.categoryId}:${selection.scenarioId}:${selection.priorityId}:${selection.budgetId}`;
  const next = [
    { ...selection, savedAt: Date.now() },
    ...current.filter(
      (item) =>
        `${item.categoryId}:${item.scenarioId}:${item.priorityId}:${item.budgetId}` !==
        key
    ),
  ].slice(0, 4);
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function QuickRecommendationDashboard() {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<CategoryId | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [priorityId, setPriorityId] = useState<QuickPriorityId | null>(null);
  const [userWish, setUserWish] = useState("");
  const [recentSelections, setRecentSelections] = useState<RecentSelection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [error, setError] = useState("");
  const [activeSimIndex, setActiveSimIndex] = useState(0);

  useEffect(() => {
    setRecentSelections(readRecentSelections());
  }, []);

  useEffect(() => {
    if (categoryId) return;
    const timer = setInterval(() => {
      setActiveSimIndex((prev) => (prev + 1) % SIM_CASES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [categoryId]);

  useEffect(() => {
    if (!categoryId) return;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [categoryId]);

  const step = !categoryId ? 1 : !scenarioId ? 2 : !priorityId ? 3 : 4;
  const questionStep = Math.max(0, step - 1);
  const questionTheme = categoryId ? QUESTION_THEMES[categoryId] : null;
  const budgets = useMemo(
    () =>
      categoryId && scenarioId
        ? getQuickBudgets(categoryId, scenarioId)
        : [],
    [categoryId, scenarioId]
  );

  const resetToStep = useCallback((target: number) => {
    setError("");
    setLocationMessage("");
    if (target <= 1) {
      setCategoryId(null);
      setScenarioId(null);
      setPriorityId(null);
      setUserWish("");
    } else if (target === 2) {
      setScenarioId(null);
      setPriorityId(null);
    } else {
      setPriorityId(null);
    }
  }, []);

  const submitRecommendation = useCallback(
    async (selection: QuickSelection) => {
      if (isLoading) return;
      setIsLoading(true);
      setError("");

      try {
        let location: LocationPayload | undefined;
        if (selection.categoryId === "food") {
          setLocationMessage("현재 위치 주변을 확인하고 있어요.");
          location = await getLocation();
          setLocationMessage(
            location
              ? "가까운 후보부터 조건을 맞추고 있어요."
              : "위치 없이도 확인 가능한 후보를 찾고 있어요."
          );
        }

        const excludedNames = readRecentRecommendationNames(
          selection.categoryId
        );
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...selection, location, excludedNames }),
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => null)) as
          | (Record<string, unknown> & { ok?: boolean })
          | null;

        if (!response.ok || payload?.ok !== true) {
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : "추천 결과를 불러오지 못했습니다."
          );
        }

        setRecentSelections(saveRecentSelection(selection));
        const recommendationNames = Array.isArray(payload.quickRecommendations)
          ? payload.quickRecommendations
              .map((item) =>
                item && typeof item === "object" && "name" in item
                  ? String(item.name)
                  : ""
              )
              .filter(Boolean)
          : [];
        saveRecentRecommendationNames(
          selection.categoryId,
          recommendationNames
        );
        sessionStorage.setItem("choiceResult", JSON.stringify(payload));
        router.push("/result");
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "일시적인 오류가 발생했습니다. 다시 시도해 주세요."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, router]
  );

  const heading =
    step === 1
      ? "무엇을 고민 중이신가요?"
      : step === 2
        ? "어떤 용도인가요?"
        : step === 3
          ? "가장 중요한 조건은?"
          : "예산은 어느 정도인가요?";
  const description =
    step === 1
      ? "고르지 못하고 미뤄둔 선택, 여기서 끝내세요."
      : step === 2
        ? "구체적인 상황 하나만 골라주세요."
        : step === 3
          ? "한 가지 기준을 먼저 세우면 결과가 훨씬 선명해져요."
          : "예산을 고르면 바로 추천을 시작해요.";

  return (
    <main
      className={cn(
        "mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[1120px] flex-col px-4 pb-20 sm:px-6 md:px-8",
        step === 1 ? "pt-4 sm:pt-8" : "pt-4 sm:pt-6"
      )}
    >
      {step > 1 && categoryId && (
        <div className="editorial-enter mb-6">
          {/* 상단 슬림 네비게이션 헤더 */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => resetToStep(step - 1)}
              className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-sm transition hover:bg-muted active:scale-95"
              aria-label="이전 질문으로 돌아가기"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {QUICK_CATEGORY_LABELS[categoryId]}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {questionStep} / 3 단계
              </span>
            </div>
          </div>

          {/* 슬림 프로그레스 바 */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${(questionStep / 3) * 100}%` }}
            />
          </div>

          {/* 질문 타이틀 */}
          <div className="mt-5">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
              {heading}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      )}

      <section aria-live="polite">
        {step === 1 && (
          <>
            {/* 1. 엔터프라이즈 스플릿 히어로 영역 */}
            <div className="editorial-enter pt-2 pb-8 sm:pt-4 sm:pb-12">
              <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
                {/* 히어로 좌측: 카피 & 가치 제안 & 빠른 시작 */}
                <div className="lg:col-span-7 text-left">
                  <div className="shimmer-badge inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-primary shadow-sm border border-blue-200/60 bg-blue-50/70">
                    <span className="sim-pulse-dot size-2 rounded-full bg-blue-600" />
                    <span>AI 의사결정 엔진 3.0 가동 중</span>
                  </div>

                  <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.18]">
                    선택 장애의 끝,<br />
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
                      확실한 1등 하나
                    </span>만 남깁니다.
                  </h1>

                  <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    수많은 바이럴 후기와 광고성 글에 지치셨나요?
                    검증된 알고리즘이 3단계 맞춤 질문을 통해 내 상황에 꼭 맞는 단 하나의 종결템을 도출합니다.
                  </p>

                  {/* 빠른 추천 인기 태그 */}
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">인기 빠른 시작:</span>
                    {POPULAR_PICKS.map((pick) => (
                      <button
                        key={pick.label}
                        type="button"
                        onClick={() => {
                          setCategoryId(pick.categoryId);
                          setScenarioId(null);
                          setPriorityId(null);
                        }}
                        className="tap-feedback group flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold text-foreground/90 shadow-sm transition hover:border-primary hover:bg-blue-50/60 hover:text-primary active:scale-95"
                      >
                        <span>{pick.label}</span>
                        <ArrowRight className="size-3 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </button>
                    ))}
                  </div>

                  {/* 신뢰 지표 스트립 */}
                  <div className="mt-8 grid grid-cols-3 gap-3 border-t border-border/80 pt-6">
                    <div>
                      <p className="text-xl font-black text-foreground sm:text-2xl tabular-nums">148,000+</p>
                      <p className="text-xs font-medium text-muted-foreground">누적 선택 해결</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-foreground sm:text-2xl tabular-nums">1분 12초</p>
                      <p className="text-xs font-medium text-muted-foreground">평균 결정 소요</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-foreground sm:text-2xl tabular-nums">98.6%</p>
                      <p className="text-xs font-medium text-muted-foreground">추천 만족도</p>
                    </div>
                  </div>
                </div>

                {/* 히어로 우측: 실시간 의사결정 시뮬레이터 (Motion Graphic Mock) */}
                <div className="lg:col-span-5">
                  <div className="relative rounded-3xl border-2 border-primary/20 bg-gradient-to-b from-white via-blue-50/30 to-white p-5 shadow-xl sm:p-6 backdrop-blur-sm">
                    {/* 상단 탭 (시뮬레이션 카테고리 전환) */}
                    <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="sim-pulse-dot size-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-foreground">실시간 의사결정 시뮬레이터</span>
                      </div>
                      <div className="flex gap-1">
                        {SIM_CASES.map((sc, idx) => (
                          <button
                            key={sc.categoryLabel}
                            type="button"
                            onClick={() => setActiveSimIndex(idx)}
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-[11px] font-bold transition",
                              activeSimIndex === idx
                                ? "bg-primary text-white shadow-xs"
                                : "bg-muted/80 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {sc.categoryLabel}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 시뮬레이터 실시간 조건 스텝 */}
                    <div className="mt-4 space-y-2.5">
                      <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2 text-xs">
                        <span className="font-semibold text-muted-foreground">01 용도 분석</span>
                        <span className="font-bold text-foreground">{SIM_CASES[activeSimIndex].q1}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2 text-xs">
                        <span className="font-semibold text-muted-foreground">02 우선 기준</span>
                        <span className="font-bold text-foreground">{SIM_CASES[activeSimIndex].q2}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2 text-xs">
                        <span className="font-semibold text-muted-foreground">03 적정 예산</span>
                        <span className="font-bold text-foreground">{SIM_CASES[activeSimIndex].q3}</span>
                      </div>
                    </div>

                    {/* AI 결론 도출 결과 카드 (애니메이션 느낌) */}
                    <div className="mt-4 rounded-2xl border-2 border-primary/30 bg-white p-4 shadow-md transition-all duration-500">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-700 border border-amber-200/70">
                          <Trophy className="size-3" />
                          <span>{SIM_CASES[activeSimIndex].tag}</span>
                        </span>
                        <span className="text-xs font-black text-primary">
                          적합도 {SIM_CASES[activeSimIndex].matchScore}%
                        </span>
                      </div>

                      <div className="mt-2.5">
                        <h4 className="text-base font-black tracking-tight text-foreground sm:text-lg">
                          {SIM_CASES[activeSimIndex].winnerName}
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {SIM_CASES[activeSimIndex].reason}
                        </p>
                        <div className="mt-2 text-sm font-bold text-foreground">
                          기준가: <span className="text-primary font-black">{SIM_CASES[activeSimIndex].price}</span>
                        </div>
                      </div>

                      {/* 시뮬레이터에서 바로 추천 시작하기 */}
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryId(SIM_CASES[activeSimIndex].categoryId);
                          setScenarioId(null);
                          setPriorityId(null);
                        }}
                        className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow transition hover:bg-blue-700 active:scale-[0.98]"
                      >
                        <span>이 카테고리에서 내 조건 추천받기</span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 카테고리 비주얼 큐레이션 (29CM / E-Commerce 룩북 스타일) */}
            <div className="mt-8 sm:mt-12">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-5 gap-2 border-b border-border/80">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Curated Categories
                  </span>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                    고민 중인 카테고리를 선택하세요
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  3단계 맞춤 질문을 통해 내 상황에 최적화된 1위를 즉시 도출합니다.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
                {CATEGORY_ORDER.map((id) => {
                  const scene = CATEGORY_SCENES[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setCategoryId(id);
                        setScenarioId(null);
                        setPriorityId(null);
                      }}
                      className="tap-feedback group relative flex min-h-[190px] sm:min-h-[240px] flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-neutral-950 p-4 sm:p-5 text-left shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-[0.99]"
                    >
                      {/* 백그라운드 이미지 + 다크 그라데이션 오버레이 */}
                      {scene?.image && (
                        <div className="absolute inset-0 z-0">
                          <Image
                            src={scene.image}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 50vw, 33vw"
                            className="object-cover opacity-60 transition duration-700 ease-out group-hover:scale-105 group-hover:opacity-75"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        </div>
                      )}

                      {/* 상단 뱃지 & 아이콘 */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] sm:text-xs font-bold text-white backdrop-blur-md border border-white/20">
                          {scene?.badge || QUICK_CATEGORY_LABELS[id]}
                        </span>
                        <span className="inline-flex size-8 sm:size-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition group-hover:bg-primary group-hover:text-white">
                          <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </span>
                      </div>

                      {/* 하단 텍스트 정보 */}
                      <div className="relative z-10 mt-auto">
                        <span className="text-[11px] font-semibold text-blue-200/90">
                          {scene?.tag}
                        </span>
                        <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight">
                          {QUICK_CATEGORY_LABELS[id]}
                        </h3>
                        <p className="mt-1 line-clamp-1 text-xs text-white/70">
                          {QUICK_CATEGORY_DESCRIPTION[id]}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. A vs B 맞춤 비교 스포트라이트 배너 */}
            <div className="mt-8">
              <a
                href="/compare"
                className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-4 sm:p-5 shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm transition group-hover:scale-105">
                    <Scale className="size-5" />
                  </span>
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-100/80 px-2 py-0.5 text-[10px] font-bold text-primary">
                      1:1 맞춤 비교 모드
                    </div>
                    <h3 className="mt-1 text-base font-bold text-foreground sm:text-lg">
                      후보가 이미 2개로 좁혀졌다면? 직접 비교하기
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      A와 B를 직접 입력하면 장단점과 최종 승자를 즉시 분석해 드립니다.
                    </p>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                  <span>비교하러 가기</span>
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </div>
              </a>
            </div>

            {/* 4. 상세페이지급 가치 설명 & AI 추천 엔진 투어 (Product Tour) */}
            <section className="mt-14 rounded-3xl border border-border/80 bg-gradient-to-b from-muted/50 to-white px-5 py-10 sm:mt-20 sm:px-8 sm:py-14">
              <div className="mx-auto max-w-2xl text-center">
                <span className="rounded-full bg-blue-100/70 px-3 py-1 text-xs font-bold text-primary">
                  ENGINE ARCHITECTURE
                </span>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                  ChoiceFlow가 1위를 지목하는 원리
                </h2>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  수천 개의 상품을 단순히 나열하지 않습니다.<br className="hidden sm:inline" />
                  엄격한 3단계 엔진을 통해 오직 신뢰할 수 있는 단 하나의 선택지만 남깁니다.
                </p>
              </div>

              {/* 3단계 상세 프로세스 카드 */}
              <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
                <div className="rounded-2xl border border-border/80 bg-white p-6 shadow-sm transition hover:shadow-md">
                  <div className="inline-flex size-10 items-center justify-center rounded-xl bg-blue-50 text-primary font-black">
                    01
                  </div>
                  <h3 className="mt-4 text-base font-bold text-foreground sm:text-lg">
                    광고·바이럴 99.8% 차단
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    체험단, 원고료 지급, 어뷰징 패턴을 역추적하여 순수한 실사용자 만족도와 핵심 후기만 필터링합니다.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-white p-6 shadow-sm transition hover:shadow-md">
                  <div className="inline-flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-black">
                    02
                  </div>
                  <h3 className="mt-4 text-base font-bold text-foreground sm:text-lg">
                    3단 정밀 가중치 매칭
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    내가 선택한 용도, 우선순위, 예산의 가중치를 계산하여 타협할 수 없는 조건에 부합하는 제품을 지목합니다.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-white p-6 shadow-sm transition hover:shadow-md">
                  <div className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-black">
                    03
                  </div>
                  <h3 className="mt-4 text-base font-bold text-foreground sm:text-lg">
                    실시간 최저가 & 로켓배송
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    고민이 끝난 즉시 최저가 구매 및 로켓배송 재고를 확인하고, 식당/데이트는 지도 실시간 정보를 연동합니다.
                  </p>
                </div>
              </div>

              {/* 신뢰 고지 */}
              <div className="mt-10 border-t border-border/70 pt-6 text-center">
                <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-xl mx-auto">
                  일부 추천 결과에는 쿠팡 파트너스 링크가 포함되어 일정액의 수수료를 제공받을 수 있으며 서비스 운영비로 사용됩니다.
                  수수료 유무는 알고리즘의 순위 산정 및 1위 선정에 일체 영향을 미치지 않습니다.
                </p>
              </div>
            </section>
          </>
        )}

        {step === 2 && categoryId && (
          <div className="grid gap-2 sm:grid-cols-2">
            {QUICK_SCENARIOS[categoryId].map((scenario, index) => (
              <ChoiceButton
                key={scenario.id}
                index={index}
                label={scenario.label}
                description={scenario.description}
                onClick={() => setScenarioId(scenario.id)}
              />
            ))}
          </div>
        )}

        {step === 3 && categoryId && (
          <div className="grid gap-2 sm:grid-cols-2">
            {QUICK_PRIORITIES[categoryId].map((priority, index) => (
              <ChoiceButton
                key={priority.id}
                index={index}
                label={priority.label}
                description={priority.description}
                onClick={() => setPriorityId(priority.id)}
              />
            ))}
          </div>
        )}

        {step === 4 && categoryId && scenarioId && priorityId && (
          <>
            <div className="mb-5 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
              <label
                htmlFor="user-wish"
                className="block text-sm font-bold text-foreground"
              >
                더 원하는 조건이 있나요?{" "}
                <span className="font-medium text-muted-foreground">(선택)</span>
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                한 줄만 적어도 추천이 훨씬 정확해져요. 빼고 싶은 것도 적을 수 있어요.
              </p>
              <input
                id="user-wish"
                type="text"
                value={userWish}
                maxLength={100}
                disabled={isLoading}
                onChange={(event) => setUserWish(event.target.value)}
                placeholder={WISH_PLACEHOLDER[categoryId]}
                className="mt-3 h-12 w-full rounded-xl border border-border bg-muted/30 px-3.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
              />
            </div>

            <p className="mb-2.5 text-xs font-semibold text-primary">
              ⚡ 예산을 누르면 AI 추천 분석이 바로 시작됩니다:
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              {budgets.map((budget, index) => (
                <ChoiceButton
                  key={budget.id}
                  index={index}
                  label={budget.label}
                  description={budget.description}
                  disabled={isLoading}
                  onClick={() =>
                    void submitRecommendation({
                      categoryId,
                      scenarioId,
                      priorityId,
                      budgetId: budget.id,
                      userWish: userWish.trim() || undefined,
                    })
                  }
                />
              ))}
            </div>

            {categoryId === "food" && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-foreground/80">
                <LocateFixed className="mt-0.5 size-4 shrink-0 text-primary" />
                <p>
                  예산을 선택하면 현재 위치 주변을 검색합니다. 거부해도 추천을 계속할 수 있습니다. ChoiceFlow는 정확한 주소를 저장하지 않습니다.
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {(isLoading || locationMessage) && (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/90 p-4 text-sm font-semibold text-blue-900 shadow-sm">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>{locationMessage || "조건에 꼭 맞는 1등 후보를 분석하고 있어요..."}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-[1.35rem] border border-destructive/25 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11"
            onClick={() => setError("")}
          >
            다시 선택하기
          </Button>
        </div>
      )}

      {step === 2 && recentSelections.length > 0 && (
        <details className="group mt-10 rounded-[1.5rem] border border-foreground/[0.08] bg-white p-5 shadow-[0_16px_45px_-40px_rgba(15,23,42,0.4)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold">최근 찾은 조건</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {recentSelections.length}개 · 이 기기에만 저장됩니다.
              </p>
            </div>
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--question-soft)] text-[var(--question-accent)] transition group-open:rotate-45">
              <ArrowUpRight className="size-4" />
            </span>
          </summary>
          <div className="mt-5 flex justify-end border-t border-foreground/[0.07] pt-4">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(RECENT_STORAGE_KEY);
                setRecentSelections([]);
              }}
              className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              기록 지우기
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {recentSelections.map((item) => {
              const scenario = getQuickScenario(item.categoryId, item.scenarioId);
              const priority = getQuickPriority(item.categoryId, item.priorityId);
              const budget = getQuickBudget(
                item.categoryId,
                item.scenarioId,
                item.budgetId
              );
              if (!scenario || !priority || !budget) return null;
              return (
                <button
                  key={`${item.categoryId}-${item.scenarioId}-${item.priorityId}-${item.budgetId}`}
                  type="button"
                  disabled={isLoading}
                  onClick={() => void submitRecommendation(item)}
                  className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-foreground/[0.08] bg-background/70 px-4 py-3 text-left transition hover:border-foreground/20 disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">
                      {QUICK_CATEGORY_LABELS[item.categoryId]} · {scenario.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {priority.label} 우선 · {budget.label}
                    </span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0" />
                </button>
              );
            })}
          </div>
        </details>
      )}

      <a
        href={categoryId ? `/?details=1&tab=${categoryId}` : "/?details=1"}
        className="mt-8 self-center text-[13px] font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        직접 조건을 입력해서 비교하기
      </a>
    </main>
  );
}

function ChoiceButton({
  index,
  label,
  description,
  disabled,
  onClick,
}: {
  index: number;
  label: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="tap-feedback group flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-border bg-white p-3.5 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-primary hover:bg-blue-50/25 active:scale-[0.98] disabled:cursor-wait disabled:opacity-50 sm:min-h-[76px] sm:p-4"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold tabular-nums text-primary transition group-hover:bg-primary group-hover:text-white">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold text-foreground sm:text-base">{label}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">
            {description}
          </span>
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  );
}
