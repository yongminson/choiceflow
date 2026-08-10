"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ListChecks,
  LocateFixed,
  RefreshCw,
  Scale,
  Tag,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ChoiceMotionField } from "@/components/landing/choice-motion-field";
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
  food: { image: "/brand/scene-food.png", accent: "#e9572f", soft: "#fff0e9", eyebrow: "Food · Nearby" },
  gift: { image: "/brand/scene-shopping.png", accent: "#6d52c7", soft: "#f1edff", eyebrow: "Gift · Thoughtful" },
  appliance: { image: "/brand/scene-appliance.png", accent: "#2556b8", soft: "#eaf1ff", eyebrow: "Home · Reliable" },
  fashion: { image: "/brand/scene-fashion.png", accent: "#a64763", soft: "#faedf1", eyebrow: "Style · Personal" },
  date: { image: "/brand/scene-lifestyle.png", accent: "#247a74", soft: "#e8f6f3", eyebrow: "Travel · Experience" },
  asset: { image: "/brand/scene-big-decision.png", accent: "#936d17", soft: "#f8f0da", eyebrow: "Decision · Long-term" },
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
      style={questionTheme ? ({
        "--question-accent": questionTheme.accent,
        "--question-soft": questionTheme.soft,
      } as CSSProperties) : undefined}
      className={cn(
        "mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[1120px] flex-col px-5 pb-20 sm:px-8",
        step === 1
          ? "isolate pt-0 before:fixed before:inset-0 before:-z-10 before:bg-[#fbfbf8]"
          : "isolate pt-6 before:fixed before:inset-0 before:-z-10 before:bg-[#f7f5f0] sm:pt-8",
      )}
    >
      {step > 1 && categoryId && questionTheme && (
        <section className="editorial-enter relative mb-8 min-h-[250px] overflow-hidden rounded-[2rem] bg-[#101318] text-white sm:min-h-[320px] sm:rounded-[2.5rem]">
          <Image
            src={questionTheme.image}
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 100vw, 1120px"
            className="object-cover object-center opacity-70"
          />
          <span className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
          <div className="relative flex min-h-[250px] flex-col justify-between p-6 sm:min-h-[320px] sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">{questionTheme.eyebrow}</p>
              <span className="relative size-16 shrink-0 rounded-2xl bg-white/90 p-1 shadow-2xl backdrop-blur sm:size-20">
                <Image src={CATEGORY_IMAGES[categoryId]} alt="" fill sizes="80px" className="object-contain p-1" />
              </span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-white/55">{questionStep} / 3 · 빠른 추천</p>
              <h2 className="mt-2 text-[30px] font-black tracking-[-0.045em] sm:text-[48px]">{QUICK_CATEGORY_LABELS[categoryId]}</h2>
              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/65 sm:text-[15px]">{QUICK_CATEGORY_DESCRIPTION[categoryId]}</p>
            </div>
          </div>
        </section>
      )}

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
                    ? "bg-[var(--question-accent)]"
                    : "bg-border"
                )}
              />
            ))}
          </div>
        </div>
      )}

      <header className={cn("flex items-start justify-between gap-4", step === 1 && "sr-only")}>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--question-accent)]">Question {questionStep}</p>
          <h1 className="text-balance text-[30px] font-black leading-tight tracking-[-0.045em] sm:text-[42px]">
            {heading}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        </div>
        {step > 1 && (
          <button
            type="button"
            onClick={() => resetToStep(step - 1)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--question-accent)]"
            aria-label="이전 질문으로 돌아가기"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
      </header>

      <section className={cn(step === 1 ? "-mt-14" : "mt-8")} aria-live="polite">
        {step === 1 && (
          <>
            <div className="choice-brand-stage relative left-1/2 min-h-[calc(100dvh-2rem)] w-[100dvw] -translate-x-1/2 overflow-hidden text-white">
              <ChoiceMotionField />
              <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[1120px] flex-col px-5 pb-8 pt-24 sm:px-8 sm:pb-10 sm:pt-28">
                <div className="editorial-enter flex items-center justify-between border-b border-white/15 pb-4 text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  <span>ChoiceFlow / Decision Platform</span>
                  <span className="hidden sm:inline">Seoul · 2026</span>
                </div>

                <div className="my-auto max-w-[740px] pb-[250px] pt-14 md:pb-10 md:pr-20">
                  <p className="editorial-enter text-[11px] font-black uppercase tracking-[0.3em] text-[#c8ff69]">
                    Choose less. Live more.
                  </p>
                  <h1 className="editorial-enter editorial-enter-delay-1 mt-6 break-keep text-[2.65rem] font-black leading-[0.9] tracking-[-0.075em] sm:text-[clamp(4.6rem,6vw,5.5rem)]">
                    <span className="block whitespace-nowrap">고민은 가볍게.</span>
                    <span className="block whitespace-nowrap">선택은 분명하게.</span>
                  </h1>
                  <p className="editorial-enter editorial-enter-delay-2 mt-8 max-w-[520px] text-pretty text-[15px] font-medium leading-[1.8] text-white/62 sm:text-[18px]">
                    수많은 후보를 더 보여주는 대신, 지금의 상황과 기준을 읽고
                    가장 잘 맞는 하나를 선명하게 골라드립니다.
                  </p>

                  <div className="editorial-enter editorial-enter-delay-3 mt-10 flex flex-col gap-3 sm:flex-row">
                    <a
                      href="#start-choice"
                      className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-white px-7 text-[15px] font-black text-[#07111f] transition duration-300 hover:-translate-y-1 hover:bg-[#c8ff69]"
                    >
                      3번의 선택으로 시작
                      <ArrowUpRight className="ml-2 size-4" />
                    </a>
                    <a
                      href="/compare"
                      className="inline-flex min-h-[56px] items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 text-[15px] font-black text-white backdrop-blur transition hover:border-white/60 hover:bg-white/10"
                    >
                      두 후보 직접 비교
                    </a>
                  </div>
                </div>

                <div className="grid gap-5 border-t border-white/15 pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Trending decisions</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {POPULAR_PICKS.map((pick) => (
                        <button
                          key={pick.label}
                          type="button"
                          onClick={() => {
                            setCategoryId(pick.categoryId);
                            setScenarioId(null);
                            setPriorityId(null);
                          }}
                          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-bold text-white/80 transition hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/10"
                        >
                          {pick.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="hidden gap-8 text-right sm:flex">
                    <div><strong className="block text-2xl font-black">03</strong><span className="text-[10px] uppercase tracking-widest text-white/40">Questions</span></div>
                    <div><strong className="block text-2xl font-black">01</strong><span className="text-[10px] uppercase tracking-widest text-white/40">Clear answer</span></div>
                    <div><strong className="block text-2xl font-black">00</strong><span className="text-[10px] uppercase tracking-widest text-white/40">Sign-up</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative left-1/2 w-[100dvw] -translate-x-1/2 overflow-hidden border-y border-foreground/10 bg-white py-4" aria-hidden>
              <div className="choice-ticker gap-8 pr-8 text-[12px] font-black uppercase tracking-[0.18em] text-foreground/45">
                {[0, 1].map((copy) => (
                  <div key={copy} className="flex shrink-0 items-center gap-8">
                    <span>FOOD</span><span>•</span><span>GIFT</span><span>•</span>
                    <span>HOME</span><span>•</span><span>STYLE</span><span>•</span>
                    <span>TRAVEL</span><span>•</span><span>BIG DECISIONS</span><span>•</span>
                  </div>
                ))}
              </div>
            </div>

            <div id="start-choice" className="scroll-mt-24 pb-5 pt-20 sm:flex sm:items-end sm:justify-between sm:pt-28">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">01 · Choose a field</p>
                <h2 className="mt-3 max-w-xl text-[34px] font-black leading-[1.02] tracking-[-0.055em] sm:text-[54px]">
                  무엇을 고르고 있나요?
                </h2>
              </div>
              <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-muted-foreground sm:mt-0 sm:text-right">
                분야를 고르면 용도, 우선순위, 예산을 차례로 묻습니다.
                직접 입력은 선택 사항입니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {CATEGORY_ORDER.map((id) => {
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setCategoryId(id);
                      setScenarioId(null);
                      setPriorityId(null);
                    }}
                    className="group relative flex min-h-[176px] flex-col justify-between overflow-hidden rounded-[1.5rem] border border-foreground/10 bg-card p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-foreground hover:shadow-[0_24px_60px_-32px_rgba(23,23,25,0.5)] sm:min-h-[210px] sm:p-6"
                  >
                    <span className="relative inline-flex size-16 items-center justify-center transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110 sm:size-20">
                      <Image
                        src={CATEGORY_IMAGES[id]}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-contain drop-shadow-[0_14px_18px_rgba(15,23,42,0.15)]"
                      />
                    </span>
                    <span className="mt-4">
                      <span className="block text-[18px] font-black tracking-[-0.025em] sm:text-[22px]">
                        {QUICK_CATEGORY_LABELS[id]}
                      </span>
                      <span className="mt-1.5 block text-[12px] leading-snug text-muted-foreground sm:text-[13px]">
                        {QUICK_CATEGORY_DESCRIPTION[id]}
                      </span>
                    </span>
                    <ArrowUpRight className="absolute right-5 top-5 size-5 text-foreground/20 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
                  </button>
                );
              })}
            </div>

            <section className="mt-20 sm:mt-28">
              <div className="mb-7 sm:flex sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Everyday decisions</p>
                  <h2 className="mt-3 text-[32px] font-black leading-[1.02] tracking-[-0.05em] sm:text-[52px]">
                    선택은 결국<br />생활의 장면이 됩니다.
                  </h2>
                </div>
                <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-muted-foreground sm:mt-0 sm:text-right">
                  먹고, 사고, 떠나는 순간마다 지금의 조건에 맞는 답을 찾습니다.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {BRAND_SCENES.map((scene) => (
                  <button
                    key={scene.src}
                    type="button"
                    onClick={() => {
                      setCategoryId(scene.categoryId);
                      setScenarioId(null);
                      setPriorityId(null);
                    }}
                    className="group relative min-h-[360px] overflow-hidden rounded-[1.75rem] text-left sm:min-h-[480px]"
                  >
                    <Image
                      src={scene.src}
                      alt={scene.title}
                      fill
                      sizes="(max-width: 767px) 100vw, 33vw"
                      className="object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-6 text-white">
                      <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{scene.eyebrow}</span>
                      <span className="mt-2 block text-[21px] font-black leading-tight tracking-[-0.03em]">{scene.title}</span>
                      <span className="mt-4 inline-flex items-center text-[12px] font-bold text-white/70">
                        바로 골라보기 <ArrowUpRight className="ml-1.5 size-4" />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* A/B 비교는 없애지 않고, 카테고리 아래 보조 진입으로 둔다. */}
            <a
              href="/compare"
              className="mt-4 flex items-center justify-between gap-4 rounded-[1.5rem] bg-foreground p-6 text-background transition hover:-translate-y-0.5 sm:p-8"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-background/50">
                  <Scale className="size-3.5" />
                  후보가 이미 정해졌다면
                </span>
                <span className="mt-2 block text-[20px] font-black tracking-tight sm:text-[28px]">
                  A와 B 중에 하나만 골라드려요
                </span>
                <span className="mt-1 block text-[13px] text-background/55">
                  두 개만 적으면 왜 그걸 골라야 하는지까지 알려드립니다
                </span>
              </span>
              <ArrowUpRight className="size-6 shrink-0 text-background" />
            </a>

            {/*
              카테고리 그리드에서 화면이 끊기면 "그래서 뭘 해주는 건데"가 남는다.
              추상적인 홍보 문구 대신 결과 화면에서 실제로 보게 될 것만 적는다.
            */}
            <section className="mt-24 overflow-hidden rounded-[2rem] bg-[#f1f0ec] px-5 py-12 sm:mt-32 sm:rounded-[3rem] sm:px-10 sm:py-16">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-foreground/45">02 · What you get</p>
              <h2 className="mt-4 max-w-3xl text-balance text-[36px] font-black leading-[0.98] tracking-[-0.06em] sm:text-[64px]">
                많이 보여주는 대신,
                <br />하나를 제대로 고릅니다.
              </h2>
              <p className="mt-5 max-w-lg text-[14px] leading-relaxed text-foreground/55 sm:text-[16px]">
                후보만 늘어놓고 끝내지 않습니다. 하나를 지목하고, 선택한 조건을
                어디까지 지켰는지 함께 보여드립니다.
              </p>

              <div className="mt-10 grid gap-px overflow-hidden rounded-[1.5rem] border border-foreground/10 bg-foreground/10 sm:grid-cols-3">
                {VALUE_POINTS.map((point) => (
                  <div
                    key={point.title}
                    className="bg-white p-6 sm:min-h-[230px] sm:p-7"
                  >
                    <span className="inline-flex size-10 items-center justify-center rounded-full bg-foreground text-background">
                      <point.icon className="size-4" aria-hidden />
                    </span>
                    <p className="mt-10 text-[18px] font-black tracking-[-0.025em] sm:text-[21px]">
                      {point.title}
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                ))}
              </div>

              <ol className="mt-8 grid gap-3 sm:grid-cols-3">
                {STEPS.map((stepLabel, index) => (
                  <li
                    key={stepLabel}
                    className="flex items-center gap-3 border-t border-foreground/20 px-1 py-4"
                  >
                    <span className="text-[11px] font-black tabular-nums text-foreground/40">
                      0{index + 1}
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
            <div className="mb-5 rounded-[1.5rem] border border-foreground/[0.08] bg-white p-5 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.35)] sm:p-6">
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
                className="mt-4 h-[52px] w-full rounded-2xl border border-foreground/10 bg-[var(--question-soft)] px-4 text-[15px] outline-none transition focus:border-[var(--question-accent)] focus:ring-2 focus:ring-[var(--question-soft)] disabled:opacity-50"
              />
            </div>

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
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[var(--question-accent)] bg-[var(--question-soft)] p-4 text-sm text-foreground/75">
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
        <div className="mt-5 rounded-[1.35rem] border border-[var(--question-accent)] bg-[var(--question-soft)] p-5 text-sm font-semibold">
          {isLoading && <RefreshCw className="mr-2 inline size-4 animate-spin" />}
          {locationMessage || "조건에 맞는 후보를 비교하고 있어요."}
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
      className="group flex min-h-[96px] items-center justify-between gap-4 rounded-[1.35rem] border border-foreground/[0.08] bg-white p-4 text-left shadow-[0_16px_45px_-38px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:border-[var(--question-accent)] hover:shadow-[0_24px_55px_-35px_rgba(15,23,42,0.35)] disabled:cursor-wait disabled:opacity-50 sm:p-5"
    >
      <span className="flex min-w-0 items-center gap-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--question-soft)] text-[12px] font-black tabular-nums text-[var(--question-accent)] transition group-hover:bg-[var(--question-accent)] group-hover:text-white">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="min-w-0">
        <span className="block text-[15px] font-black">{label}</span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">
          {description}
        </span>
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--question-accent)]" />
    </button>
  );
}
