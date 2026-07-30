"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Gift,
  HousePlug,
  KeyRound,
  LocateFixed,
  Plane,
  RefreshCw,
  Shirt,
  SlidersHorizontal,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
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
};

type RecentSelection = QuickSelection & {
  savedAt: number;
};

const RECENT_STORAGE_KEY = "choiceflow-recent-selections";

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  food: Utensils,
  gift: Gift,
  appliance: HousePlug,
  fashion: Shirt,
  date: Plane,
  asset: KeyRound,
};

const CATEGORY_ACCENTS: Record<CategoryId, string> = {
  food: "bg-orange-100 text-orange-600 ring-orange-200/80",
  gift: "bg-pink-100 text-pink-600 ring-pink-200/80",
  appliance: "bg-sky-100 text-sky-600 ring-sky-200/80",
  fashion: "bg-violet-100 text-violet-600 ring-violet-200/80",
  date: "bg-emerald-100 text-emerald-600 ring-emerald-200/80",
  asset: "bg-amber-100 text-amber-700 ring-amber-200/80",
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
      ? "무엇을 찾고 있나요?"
      : step === 2
        ? "어떤 용도인가요?"
        : step === 3
          ? "가장 중요한 조건은?"
          : "예산은 어느 정도인가요?";
  const description =
    step === 1
      ? "지금 필요한 분야를 고르면 선택지를 빠르게 좁혀드려요."
      : step === 2
        ? "구체적인 상황 하나만 골라주세요."
        : step === 3
          ? "한 가지 기준을 먼저 세우면 결과가 훨씬 선명해져요."
          : "최종 결제 가능한 범위를 기준으로 찾아볼게요.";

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col bg-[radial-gradient(circle_at_8%_8%,rgba(254,215,170,0.5),transparent_30%),radial-gradient(circle_at_92%_12%,rgba(196,181,253,0.45),transparent_32%),radial-gradient(circle_at_50%_72%,rgba(186,230,253,0.38),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(239,246,255,0.5))] px-4 pb-24 pt-7 sm:rounded-[2.5rem] sm:px-8 sm:pt-12">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Choice guide
          </p>
          <p className="text-xs font-semibold tabular-nums text-muted-foreground">
            {questionStep === 0 ? "분야 선택" : `${questionStep} / 3`}
          </p>
        </div>
        <div
          className="mt-3 grid grid-cols-3 gap-1.5"
          aria-label={
            questionStep === 0
              ? "빠른 추천 시작"
              : `기본 질문 ${questionStep} / 전체 3개`
          }
        >
          {[1, 2, 3].map((item) => (
            <span
              key={item}
              className={cn(
                "h-1 rounded-full transition-colors",
                item <= questionStep ? "bg-foreground" : "bg-foreground/10"
              )}
            />
          ))}
        </div>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-balance font-display text-[2rem] font-black leading-[1.1] tracking-[-0.05em] sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {step > 1 && (
          <button
            type="button"
            onClick={() => resetToStep(step - 1)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-background/80 transition hover:bg-muted"
            aria-label="이전 질문으로 돌아가기"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
      </header>

      <section className="mt-8" aria-live="polite">
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                  className="group flex min-h-36 flex-col items-start justify-between rounded-[1.4rem] border border-white/80 bg-white/85 p-5 text-left shadow-[0_18px_45px_-28px_rgba(59,130,246,0.42)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-white hover:bg-white hover:shadow-[0_22px_50px_-26px_rgba(99,102,241,0.42)] active:translate-y-0"
                >
                  <span
                    className={cn(
                      "inline-flex size-11 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:scale-110",
                      CATEGORY_ACCENTS[id]
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-display text-lg font-bold">
                      {QUICK_CATEGORY_LABELS[id]}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                      {QUICK_CATEGORY_DESCRIPTION[id]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && categoryId && (
          <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="grid gap-3 sm:grid-cols-3">
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

      {step === 1 && recentSelections.length > 0 && (
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
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "mt-8 min-h-12 self-center rounded-full px-5 text-muted-foreground"
        )}
      >
        <SlidersHorizontal className="mr-2 size-4" />
        직접 조건을 입력해서 비교
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
      className="group flex min-h-24 items-center justify-between gap-4 rounded-[1.25rem] border border-white/80 bg-white/85 p-5 text-left shadow-[0_16px_40px_-28px_rgba(59,130,246,0.42)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white active:translate-y-0 disabled:cursor-wait disabled:opacity-50"
    >
      <span>
        <span className="block font-display text-lg font-bold">{label}</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </button>
  );
}
