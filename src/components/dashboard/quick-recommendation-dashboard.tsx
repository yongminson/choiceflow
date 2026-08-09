"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Gift,
  HousePlug,
  KeyRound,
  ListChecks,
  LocateFixed,
  Plane,
  RefreshCw,
  Scale,
  Shirt,
  Tag,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";
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
  asset: KeyRound,
};

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

  const step = !categoryId ? 1 : !scenarioId ? 2 : !priorityId ? 3 : 4;
  const questionStep = Math.max(0, step - 1);
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
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[1120px] flex-col px-5 pb-20 pt-8 sm:px-8">
      {step > 1 && (
        <div className="mb-7">
          <p className="text-[12px] font-bold text-muted-foreground">
            {questionStep} / 3
          </p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3].map((item) => (
              <span
                key={item}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  item <= questionStep
                    ? "bg-foreground"
                    : "bg-border"
                )}
              />
            ))}
          </div>
        </div>
      )}

      <header className={cn("flex items-start justify-between gap-4", step === 1 && "sr-only")}>
        <div>
          <h1 className="text-balance text-[26px] font-black leading-tight tracking-[-0.03em] sm:text-[30px]">
            {heading}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {step > 1 && (
          <button
            type="button"
            onClick={() => resetToStep(step - 1)}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border transition hover:border-foreground/40"
            aria-label="이전 질문으로 돌아가기"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
      </header>

      <section className="mt-8" aria-live="polite">
        {step === 1 && (
          <>
            {/* 히어로 — 첫 화면은 "무엇을 해주는 서비스인지"만 말한다. */}
            <div className="pb-12 pt-6 text-center sm:pb-16 sm:pt-10">
              <p className="mx-auto max-w-2xl text-balance text-[32px] font-black leading-[1.15] tracking-[-0.035em] sm:text-[46px]">
                고민은 짧게,
                <br className="sm:hidden" /> 선택은 확실하게.
              </p>
              <p className="mx-auto mt-4 max-w-lg text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
                몇 가지만 알려주시면 수많은 상품 중 살 만한 것만 골라드릴게요.
              </p>

              <div className="mt-9">
                <p className="text-[12px] font-bold text-muted-foreground">
                  지금 가장 많이 고민하는 선택
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {POPULAR_PICKS.map((pick) => (
                    <button
                      key={pick.label}
                      type="button"
                      onClick={() => {
                        setCategoryId(pick.categoryId);
                        setScenarioId(null);
                        setPriorityId(null);
                      }}
                      className="rounded-full border border-border bg-card px-4 py-2 text-[14px] font-bold transition hover:border-primary hover:text-primary"
                    >
                      {pick.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <h2 className="mb-4 text-[20px] font-black tracking-tight sm:text-[24px]">
              어떤 걸 고르고 있나요?
            </h2>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
                    className="group flex min-h-[136px] flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary hover:shadow-[0_10px_28px_-14px_rgba(37,99,235,0.4)] sm:min-h-[152px]"
                  >
                    <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="mt-4">
                      <span className="block text-[17px] font-black tracking-tight sm:text-[18px]">
                        {QUICK_CATEGORY_LABELS[id]}
                      </span>
                      <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
                        {QUICK_CATEGORY_DESCRIPTION[id]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* A/B 비교는 없애지 않고, 카테고리 아래 보조 진입으로 둔다. */}
            <a
              href="/compare"
              className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary-soft p-5 transition hover:border-primary"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-primary">
                  <Scale className="size-3.5" />
                  후보가 이미 정해졌다면
                </span>
                <span className="mt-1.5 block text-[16px] font-black tracking-tight">
                  A와 B 중에 하나만 골라드려요
                </span>
                <span className="mt-1 block text-[13px] text-muted-foreground">
                  두 개만 적으면 왜 그걸 골라야 하는지까지 알려드립니다
                </span>
              </span>
              <ArrowUpRight className="size-5 shrink-0 text-primary" />
            </a>

            {/*
              카테고리 그리드에서 화면이 끊기면 "그래서 뭘 해주는 건데"가 남는다.
              추상적인 홍보 문구 대신 결과 화면에서 실제로 보게 될 것만 적는다.
            */}
            <section className="mt-14 border-t border-border pt-12">
              <h2 className="text-[20px] font-black tracking-tight sm:text-[24px]">
                고르고 나면 이런 게 나와요
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                후보만 늘어놓고 끝내지 않습니다. 하나를 지목하고, 왜 그건지까지
                남깁니다.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {VALUE_POINTS.map((point) => (
                  <div
                    key={point.title}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <point.icon className="size-4" aria-hidden />
                    </span>
                    <p className="mt-3.5 text-[15px] font-black tracking-tight">
                      {point.title}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                ))}
              </div>

              <ol className="mt-3 grid gap-3 sm:grid-cols-3">
                {STEPS.map((stepLabel, index) => (
                  <li
                    key={stepLabel}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4"
                  >
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[12px] font-black text-background">
                      {index + 1}
                    </span>
                    <span className="text-[14px] font-bold">{stepLabel}</span>
                  </li>
                ))}
              </ol>

              <p className="mt-6 text-[12px] leading-relaxed text-muted-foreground">
                일부 결과에는 쿠팡 파트너스 링크가 포함되며, 이에 따라 일정액의
                수수료를 제공받습니다. 수수료 유무가 추천 순위에 영향을 주지
                않습니다.
              </p>
            </section>
          </>
        )}

        {step === 2 && categoryId && (
          <div className="grid gap-2 sm:grid-cols-2">
            {QUICK_SCENARIOS[categoryId].map((scenario) => (
              <ChoiceButton
                key={scenario.id}
                label={scenario.label}
                description={scenario.description}
                onClick={() => setScenarioId(scenario.id)}
              />
            ))}
          </div>
        )}

        {step === 3 && categoryId && (
          <div className="grid gap-2 sm:grid-cols-2">
            {QUICK_PRIORITIES[categoryId].map((priority) => (
              <ChoiceButton
                key={priority.id}
                label={priority.label}
                description={priority.description}
                onClick={() => setPriorityId(priority.id)}
              />
            ))}
          </div>
        )}

        {step === 4 && categoryId && scenarioId && priorityId && (
          <>
            <div className="mb-5 rounded-2xl border border-foreground/10 bg-background/80 p-4">
              <label
                htmlFor="user-wish"
                className="block text-sm font-bold"
              >
                더 원하는 게 있나요?{" "}
                <span className="font-medium text-muted-foreground">(선택)</span>
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                한 줄만 적어도 추천이 확 달라져요. 빼고 싶은 것도 적을 수 있어요.
              </p>
              <input
                id="user-wish"
                type="text"
                value={userWish}
                maxLength={100}
                disabled={isLoading}
                onChange={(event) => setUserWish(event.target.value)}
                placeholder={WISH_PLACEHOLDER[categoryId]}
                className="mt-3 h-12 w-full rounded-xl border border-foreground/15 bg-white px-4 text-[15px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 dark:bg-white/10"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {budgets.map((budget) => (
                <ChoiceButton
                  key={budget.id}
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
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.07] p-4 text-sm text-emerald-900 dark:text-emerald-100">
                <LocateFixed className="mt-0.5 size-4 shrink-0" />
                <p>
                  예산을 선택하면 위치 권한을 요청합니다. 거부해도 계속할 수
                  있습니다. 지도 연동 시 좌표가 Google Places에 전달되며
                  ChoiceFlow는 정확한 주소를 저장하지 않습니다.
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {(isLoading || locationMessage) && (
        <div className="mt-5 rounded-2xl border border-foreground/10 bg-background/80 p-4 text-sm">
          {isLoading && <RefreshCw className="mr-2 inline size-4 animate-spin" />}
          {locationMessage || "조건에 맞는 후보를 비교하고 있어요."}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/5 p-4"
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
        <section className="mt-10 border-t border-foreground/10 pt-7">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-bold">최근 찾은 조건</p>
              <p className="mt-1 text-xs text-muted-foreground">
                이 기기에만 저장됩니다.
              </p>
            </div>
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
        </section>
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
  label,
  description,
  disabled,
  onClick,
}: {
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
      className="flex min-h-[68px] items-center justify-between gap-4 rounded-xl border border-border p-4 text-left transition hover:border-neutral-900 disabled:cursor-wait disabled:opacity-50 dark:border-neutral-800 dark:hover:border-white"
    >
      <span>
        <span className="block text-[15px] font-black">{label}</span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
