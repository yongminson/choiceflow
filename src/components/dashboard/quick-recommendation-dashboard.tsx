"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Gift,
  HousePlug,
  Landmark,
  ListChecks,
  LocateFixed,
  Plane,
  RefreshCw,
  Scale,
  Shirt,
  Sparkles,
  Tag,
  Trophy,
  Utensils,
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

const BRAND_SCENES: Array<{
  categoryId: CategoryId;
  src: string;
  eyebrow: string;
  title: string;
}> = [
  { categoryId: "food", src: "/brand/scene-food.png", eyebrow: "Food · Local", title: "오늘의 메뉴와 가까운 맛집" },
  { categoryId: "gift", src: "/brand/scene-shopping.png", eyebrow: "Gift · Product", title: "마음을 전할 선물과 오래 쓸 물건" },
  { categoryId: "date", src: "/brand/scene-lifestyle.png", eyebrow: "Style · Travel", title: "나에게 맞는 스타일과 다음 여행" },
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

  useEffect(() => {
    setRecentSelections(readRecentSelections());
  }, []);

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
            {/* 1. 히어로 영역 - 모바일 첫 뷰포트에서 목적을 즉시 이해 */}
            <div className="editorial-enter mx-auto max-w-2xl py-3 text-center sm:py-6">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5 text-primary" />
                <span>3번의 탭으로 끝내는 똑똑한 선택</span>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
                고민은 가볍게,{" "}
                <span className="font-extrabold text-primary">선택은 확실하게.</span>
              </h1>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                수많은 리뷰와 광고에 지쳤을 때, 지금 내 상황과 조건에 꼭 맞는 1등 하나를 명쾌하게 골라드립니다.
              </p>

              {/* 빠른 추천 인기 칩 */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                <span className="mr-1 hidden text-xs text-muted-foreground sm:inline">빠른 시작:</span>
                {POPULAR_PICKS.map((pick) => (
                  <button
                    key={pick.label}
                    type="button"
                    onClick={() => {
                      setCategoryId(pick.categoryId);
                      setScenarioId(null);
                      setPriorityId(null);
                    }}
                    className="tap-feedback rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-foreground/80 transition hover:border-primary hover:bg-blue-50/50 hover:text-primary"
                  >
                    {pick.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 카테고리 선택 그리드 - 모바일 첫 화면에서 100% 즉시 확인 가능 */}
            <div className="mt-3 sm:mt-6">
              <div className="flex items-center justify-between pb-3">
                <h2 className="text-base font-bold text-foreground sm:text-lg">
                  고민 중인 분야를 선택하세요
                </h2>
                <span className="text-xs text-muted-foreground">용도 · 조건 · 예산 3단계</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5">
                {CATEGORY_ORDER.map((id) => {
                  const Icon = CATEGORY_ICONS[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setCategoryId(id);
                        setScenarioId(null);
                        setPriorityId(null);
                      }}
                      className="tap-feedback group relative flex min-h-[108px] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md sm:min-h-[124px] sm:p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-blue-50 text-primary transition group-hover:bg-primary group-hover:text-white sm:size-10">
                          <Icon className="size-5" />
                        </span>
                        <ArrowUpRight className="size-4 text-muted-foreground/40 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                      <div className="mt-3">
                        <span className="block text-[15px] font-bold tracking-tight text-foreground sm:text-base">
                          {QUICK_CATEGORY_LABELS[id]}
                        </span>
                        <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">
                          {QUICK_CATEGORY_DESCRIPTION[id]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. A vs B 직접 비교 보조 진입 */}
            <a
              href="/compare"
              className="mt-3.5 flex items-center justify-between rounded-xl border border-border bg-white p-3.5 text-foreground transition hover:border-primary hover:bg-blue-50/20 sm:p-4"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Scale className="size-4 text-primary" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    후보가 이미 2개로 좁혀졌다면?
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    A와 B를 직접 적으면 왜 그걸 골라야 하는지 명쾌하게 비교해 드려요
                  </span>
                </span>
              </span>
              <ArrowRight className="ml-2 size-4 shrink-0 text-muted-foreground" />
            </a>

            {/* 4. 제품 가치 이해 및 신뢰 섹션 */}
            <section className="mt-12 rounded-3xl border border-border bg-muted/40 px-5 py-8 sm:mt-16 sm:px-8 sm:py-10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">02 · What you get</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                많이 보여주는 대신, 하나를 제대로 고릅니다.
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                후보만 나열하고 끝나지 않습니다. 가장 적합한 1등을 지목하고, 선택한 조건을 어디까지 지켰는지 함께 검증해 드립니다.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {VALUE_POINTS.map((point) => (
                  <div
                    key={point.title}
                    className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                  >
                    <span className="inline-flex size-9 items-center justify-center rounded-xl bg-blue-50 text-primary">
                      <point.icon className="size-4" aria-hidden />
                    </span>
                    <p className="mt-4 text-base font-bold tracking-tight text-foreground">
                      {point.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
                일부 결과에는 쿠팡 파트너스 링크가 포함되며 이에 따른 일정액의 수수료를 제공받아 무료로 서비스를 운영합니다. 수수료 유무는 추천 순위에 영향을 주지 않습니다.
              </p>
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
