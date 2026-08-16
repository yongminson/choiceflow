"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Minus,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { ShareResultButton } from "@/components/result/share-result-button";
import { buildDirectCoupangNpSearchUrl } from "@/lib/monetization/coupang-search";
import {
  getQuickAdvancedQuestions,
  type QuickAdvancedOption,
} from "@/lib/recommendation/quick-options";
import {
  readRecentRecommendationNames,
  saveRecentRecommendationNames,
} from "@/lib/recommendation/recent-recommendations";
import { isCategoryId } from "@/lib/types/category";
import type { AnalyzeApiResult, QuickRecommendation } from "@/lib/types/analyze";
import { cn } from "@/lib/utils";

type AdvancedAnswer = {
  questionId: string;
  optionId: string;
};

type LocationPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

/** 결과에서 또 고민하지 않도록 1등을 확실히 구분한다. */
const ROLE_BADGE: Record<
  NonNullable<QuickRecommendation["selectionType"]>,
  { label: string; className: string }
> = {
  best: {
    label: "가장 추천",
    className: "bg-foreground text-background",
  },
  value: {
    label: "가성비 선택",
    className: "bg-[#dff6d6] text-[#244b1d]",
  },
  reliable: {
    label: "검증 우선",
    className: "bg-muted text-muted-foreground",
  },
  premium: {
    label: "한 단계 위",
    className: "bg-muted text-muted-foreground",
  },
};

/** 음식 상황별로 쿠팡에서 실제로 잘 잡히는 상품 검색어 */
const FOOD_RELATED_KEYWORDS: Record<string, string> = {
  solo: "혼밥 간편식 도시락",
  couple: "홈파티 밀키트 2인",
  group: "모임용 대용량 밀키트",
  family: "가족 밀키트 4인분",
  delivery: "야식 냉동 간편식",
  healthy: "샐러드 도시락 다이어트 식단",
};

/**
 * 종합 적합도 그래프.
 *
 * 축을 나눠 그리면 축마다 1등이 달라져 "그래서 뭘 고르라는 건지" 혼란만 커진다.
 * 결론을 하나로 보여주는 것이 이 서비스의 역할이므로 종합 점수 하나로 세우고,
 * 세부 축은 각 후보 카드 안에서 보조로만 읽히게 한다.
 */
function OverallChart({
  items,
  accent,
}: {
  items: QuickRecommendation[];
  accent: string;
}) {
  const scored = items.filter((item) => typeof item.overall === "number");
  if (scored.length < 2) return null;
  const ranked = [...scored].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  const top = ranked[0]?.overall ?? 100;

  return (
    <section className="editorial-enter editorial-enter-delay-2 mt-8 rounded-[1.5rem] bg-[#f1f0ec] p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold tracking-tight">종합 적합도</h2>
        <span className="text-[11px] text-muted-foreground">
          내 조건 기준 · 후보 간 상대 평가
        </span>
      </div>

      <div className="mt-4 space-y-3.5">
        {ranked.map((item, index) => {
          const value = item.overall ?? 0;
          const isTop = index === 0;
          return (
            <div key={`${item.name}-overall`}>
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "min-w-0 truncate text-[13px]",
                    isTop ? "font-bold" : "text-muted-foreground"
                  )}
                >
                  {isTop && (
                    <span className="mr-1.5 text-[10px] font-black tracking-wide text-primary">
                      1위
                    </span>
                  )}
                  {item.name}
                </span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    isTop
                      ? "text-[15px] font-black"
                      : "text-[13px] font-bold text-muted-foreground"
                  )}
                >
                  {value}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700 ease-out",
                    isTop ? accent : "bg-foreground/20"
                  )}
                  style={{ width: `${Math.max(6, (value / (top || 100)) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 조건 충족 체크리스트.
 *
 * 줄글 이유는 카드 4개를 나란히 놓았을 때 비교가 안 된다.
 * 조건 단위로 끊어 두면 훑기만 해도 "내 조건을 지켰는지"가 바로 보인다.
 */
function FitChecklist({
  checks,
}: {
  checks: QuickRecommendation["fitChecks"];
}) {
  if (!checks?.length) return null;

  // 확인된 사실과 AI 판단을 나눠 보여준다. 같은 체크 표시로 나란히 두면
  // 어느 쪽이 실제로 확인된 것인지 구분할 수 없다.
  const verified = checks.filter((check) => check.source === "verified");
  const guides = checks.filter((check) => check.source !== "verified");

  return (
    <div className="mt-3.5">
      {verified.length > 0 && (
        <ul className="space-y-1.5">
          {verified.map((check) => (
            <li
              key={check.text}
              className="flex items-start gap-2 text-[13.5px] leading-snug"
            >
              {check.ok ? (
                <Check
                  className="mt-[3px] size-4 shrink-0 text-success"
                  aria-hidden
                />
              ) : (
                <Minus
                  className="mt-[3px] size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
              <span className={cn(!check.ok && "text-muted-foreground")}>
                {check.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {guides.length > 0 && (
        <div className={cn(verified.length > 0 && "mt-3 border-t border-border pt-3")}>
          <p className="text-[11px] font-bold text-muted-foreground">
            조건으로 본 판단
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {guides.map((check) => (
              <li
                key={check.text}
                className="flex items-start gap-2 text-[13px] leading-snug text-muted-foreground"
              >
                <span
                  className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground/60"
                  aria-hidden
                />
                <span>{check.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 카드 안 세부 축 — 종합 점수를 보조 설명하는 역할만 한다. */
function AxisBreakdown({ scores }: { scores: QuickRecommendation["scores"] }) {
  if (!scores?.length) return null;
  return (
    <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {scores.map((score) => (
        <div key={score.label} className="flex items-center gap-1.5">
          <dt className="text-[11px] text-muted-foreground">{score.label}</dt>
          <dd className="text-[11px] font-bold tabular-nums">{score.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function recommendationEvidence(item: QuickRecommendation) {
  if (item.evidence?.length) return item.evidence;
  return [
    { label: "판단 근거", text: item.qualitySummary },
    ...(item.asSummary
      ? [{ label: "보증·신뢰성", text: item.asSummary }]
      : []),
    ...(item.depreciationSummary
      ? [{ label: "유지비·감가", text: item.depreciationSummary }]
      : []),
  ];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

function formatPriceLevel(level?: string) {
  if (level === "PRICE_LEVEL_FREE") return "무료";
  if (level === "PRICE_LEVEL_INEXPENSIVE") return "저렴";
  if (level === "PRICE_LEVEL_MODERATE") return "보통";
  if (level === "PRICE_LEVEL_EXPENSIVE") return "높음";
  if (level === "PRICE_LEVEL_VERY_EXPENSIVE") return "매우 높음";
  return undefined;
}

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

/** 제휴 링크 클릭을 GA로 남긴다. 어떤 카테고리·후보가 수익을 내는지 봐야 개선할 수 있다. */
function trackOutboundClick(params: {
  categoryId?: string;
  selectionType?: string;
  name: string;
  keyword: string;
  position: number;
}) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", "affiliate_click", {
    category_id: params.categoryId || "unknown",
    selection_type: params.selectionType || "unknown",
    item_name: params.name,
    search_keyword: params.keyword,
    position: params.position,
  });
}

export function QuickRecommendationResult({
  data,
  onResultUpdate,
}: {
  data: AnalyzeApiResult;
  onResultUpdate: (result: AnalyzeApiResult) => void;
}) {
  const recommendations = (data.quickRecommendations || []).slice(0, 4);
  const winner = recommendations[0];
  const isFood = data.categoryId === "food";
  // 라벨과 실제 링크가 어긋나면 신뢰가 무너진다. 카테고리별로 나눠 쓴다.
  const isCoupang =
    data.categoryId === "gift" ||
    data.categoryId === "appliance" ||
    data.categoryId === "fashion";
  const isAdvisory = data.categoryId === "asset";
  // 음식은 결과 링크가 지도로 나가 제휴 수익이 발생하지 않는다.
  // 후보 이름을 그대로 쓰면 "백반 맛집 밀키트" 같은 검색어가 되므로 상황별로 고정한다.
  const relatedKeyword = isFood
    ? FOOD_RELATED_KEYWORDS[data.quickScenarioId || ""] || "간편 밀키트 세트"
    : "";
  const hasLivePrice = data.providerStatus?.price === "live";
  const hasLivePlaces = data.providerStatus?.places === "live";
  // AI가 폴백이면 정밀 질문을 답해도 같은 후보가 나온다. 빈 약속을 하지 않는다.
  const aiAvailable = isFood
    ? hasLivePlaces
    : data.providerStatus?.ai === "live";
  const resultCategoryId = data.categoryId || null;
  const categoryId = isCategoryId(resultCategoryId) ? resultCategoryId : null;
  const advancedQuestions = useMemo(
    () => (categoryId ? getQuickAdvancedQuestions(categoryId) : []),
    [categoryId]
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AdvancedAnswer[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState("");
  const question = advancedQuestions[questionIndex];
  const canRefine = Boolean(
    categoryId &&
      data.quickScenarioId &&
      data.quickPriorityId &&
      data.quickBudgetId
  );

  const selectAdvancedOption = (
    questionId: string,
    option: QuickAdvancedOption
  ) => {
    setRefineError("");
    setAnswers((current) => [
      ...current.filter((answer) => answer.questionId !== questionId),
      { questionId, optionId: option.id },
    ]);
    if (questionIndex < advancedQuestions.length - 1) {
      setQuestionIndex((current) => current + 1);
    }
  };

  const submitRefinement = async () => {
    if (
      !categoryId ||
      !data.quickScenarioId ||
      !data.quickPriorityId ||
      !data.quickBudgetId ||
      answers.length === 0 ||
      isRefining
    ) {
      return;
    }

    setIsRefining(true);
    setRefineError("");
    try {
      const location = categoryId === "food" ? await getLocation() : undefined;
      const excludedNames = Array.from(
        new Set([
          ...readRecentRecommendationNames(categoryId),
          ...recommendations.map((item) => item.name),
        ])
      ).slice(0, 12);
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          scenarioId: data.quickScenarioId,
          priorityId: data.quickPriorityId,
          budgetId: data.quickBudgetId,
          userWish: data.quickUserWish,
          advancedAnswers: answers,
          location,
          excludedNames,
        }),
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as
        | (AnalyzeApiResult & { ok?: boolean; error?: string })
        | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(
          payload?.error || "정밀 추천 결과를 불러오지 못했습니다."
        );
      }

      sessionStorage.setItem("choiceResult", JSON.stringify(payload));
      saveRecentRecommendationNames(
        categoryId,
        (payload.quickRecommendations || []).map((item) => item.name)
      );
      onResultUpdate(payload);
      setShowAdvanced(false);
      setQuestionIndex(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setRefineError(
        reason instanceof Error
          ? reason.message
          : "일시적인 오류가 발생했습니다. 다시 시도해 주세요."
      );
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <main className="relative isolate mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[1180px] px-5 pb-20 pt-6 before:fixed before:inset-0 before:-z-10 before:bg-[#f4f1eb] sm:px-8 sm:pt-10">
      <header className="choice-brand-stage editorial-enter overflow-hidden rounded-[2rem] text-white sm:rounded-[3rem]">
        <div className={cn("grid", winner?.imageUrl && "lg:grid-cols-[1.2fr_0.8fr]")}>
          <div className="flex min-h-[430px] flex-col justify-between p-6 sm:min-h-[520px] sm:p-10 lg:p-14">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-background/45 sm:text-[11px]">
                <span>ChoiceFlow result</span>
                <span>•</span>
                <span>
                  {[data.quickScenarioLabel, data.quickPriorityLabel && `${data.quickPriorityLabel} 우선`, data.quickBudgetLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <p className="mt-10 text-[12px] font-bold text-background/55">지금 가장 잘 맞는 선택</p>
              <h1 className="mt-3 max-w-3xl break-keep text-[clamp(2.8rem,7vw,6.2rem)] font-black leading-[0.94] tracking-[-0.075em]">
                {winner?.name || `${data.quickScenarioLabel} 추천`}
              </h1>
              <p className="mt-6 max-w-2xl text-[14px] font-medium leading-relaxed text-background/60 sm:text-[17px]">
                {winner?.reason ||
                  "선택한 조건을 기준으로 가장 적합한 후보를 정리했어요."}
              </p>

              {data.quickUserWish && (
                <p className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-background/15 px-4 py-2 text-xs font-bold text-background/75">
                  <Sparkles className="size-3.5 shrink-0" />
                  <span className="truncate">요청 반영 · {data.quickUserWish}</span>
                </p>
              )}
            </div>

            {winner?.sourceUrl && (
              <a
                href={winner.sourceUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() =>
                  trackOutboundClick({
                    categoryId: data.categoryId,
                    selectionType: winner.selectionType,
                    name: winner.name,
                    keyword: winner.searchKeyword,
                    position: 0,
                  })
                }
                className="mt-10 inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-background px-6 text-[15px] font-black text-foreground transition hover:-translate-y-0.5 hover:shadow-2xl sm:w-fit"
              >
                {isFood
                  ? "지도에서 이곳 확인하기"
                  : isCoupang
                    ? "쿠팡에서 현재 가격 확인"
                    : "조건 직접 확인하기"}
                <ExternalLink className="ml-2 size-4" />
              </a>
            )}
          </div>

          {winner?.imageUrl && (
            <div className="min-h-[300px] bg-[#ecebe6] p-5 lg:min-h-full lg:p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={winner.imageUrl}
                alt=""
                width={720}
                height={720}
                className="h-full min-h-[280px] w-full rounded-[1.5rem] object-cover lg:rounded-[2rem]"
              />
            </div>
          )}
        </div>
      </header>

      <p className="editorial-enter editorial-enter-delay-1 mt-5 border-y border-foreground/10 py-4 text-xs font-medium leading-relaxed text-muted-foreground">
        {isFood
          ? hasLivePlaces
            ? "현재 위치 주변 매장의 평점·후기를 반영했어요. 영업 상태는 방문 전 확인하세요."
            : "주변 매장 데이터를 불러오지 못해 메뉴 후보만 제안해요. 지도에서 확인하세요."
          : isCoupang
            ? "가격·재고는 쿠팡에서 최종 확인하세요."
            : isAdvisory
              ? "판단 방향만 제시합니다. 계약 조건은 반드시 직접 확인하세요."
              : "예약 조건과 취소 규정은 이동 후 직접 확인하세요."}
        {data.recommendationContext?.length
          ? ` · ${data.recommendationContext.join(" · ")}`
          : ""}
      </p>

      <OverallChart
        items={recommendations}
        accent={
          isFood
            ? "bg-emerald-600"
            : isCoupang
              ? "bg-[#ae0000]"
              : "bg-foreground"
        }
      />

      <div className="mb-5 mt-16 sm:flex sm:items-end sm:justify-between sm:mt-24">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Candidates</p>
          <h2 className="mt-2 text-[34px] font-black leading-none tracking-[-0.055em] sm:text-[54px]">
            다른 관점의 선택들
          </h2>
        </div>
        <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted-foreground sm:mt-0 sm:text-right">
          같은 조건에서도 가격, 검증, 경험 중 무엇을 더 보느냐에 따라 답은 달라집니다.
        </p>
      </div>

      {/*
        공정위 추천·보증 심사지침은 경제적 이해관계를 추천 내용과 가까운
        위치에 표시하도록 한다. 푸터에만 두지 않고 상품 바로 위에 둔다.
        쿠팡 링크가 실제로 있는 화면에서만 노출한다.
      */}
      {(isCoupang || (isFood && relatedKeyword)) && (
        <p className="mb-3 rounded-lg bg-muted px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
          이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
          제공받습니다.
        </p>
      )}

      {/* 후보는 항상 4개다. 3열로 두면 마지막 하나만 다음 줄에 떨어져 빈 칸이 생긴다. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {recommendations.map((item, index) => {
          const priceLevel = formatPriceLevel(item.priceLevel);
          const badge = item.selectionType
            ? ROLE_BADGE[item.selectionType]
            : ROLE_BADGE.best;
          return (
            <article
              key={`${item.selectionType || index}-${item.name}`} className={cn(
                "group flex flex-col rounded-[1.5rem] border bg-card p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-34px_rgba(23,23,25,0.55)] sm:p-5",
                index === 0
                  ? "border-foreground bg-[#f1f0ec] ring-1 ring-foreground/10"
                  : "border-foreground/10"
              )}
            >
              <span
                className={cn(
                  "inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]",
                  badge.className
                )}
              >
                {String(index + 1).padStart(2, "0")} · {badge.label}
              </span>
              <div className="mt-3 flex gap-3 lg:flex-col">
                {item.imageUrl && (
                  /* 쿠팡 상품 썸네일. 이미지 최적화가 꺼져 있어 img 를 쓴다. */
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.imageUrl}
                    alt=""
                    width={84}
                    height={84}
                    loading="lazy"
                    decoding="async"
                    className="size-[84px] shrink-0 rounded-[1rem] border border-border object-cover transition duration-500 group-hover:scale-[1.02] lg:h-[168px] lg:w-full"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="break-keep text-[18px] font-black leading-snug">
                    {item.name}
                  </h3>
                  {typeof item.price === "number" ? (
                    <>
                      <p className="mt-1.5 text-[20px] font-black tabular-nums">
                        {formatPrice(item.price)}
                        <span className="text-[14px] font-bold">원</span>
                      </p>
                      {item.isRocket && (
                        <span className="mt-1 inline-block rounded bg-[#ae0000]/[0.08] px-1.5 py-0.5 text-[10px] font-black text-[#ae0000] dark:text-red-400">
                          로켓배송
                        </span>
                      )}
                    </>
                  ) : priceLevel ? (
                    <p className="mt-1.5 text-[13px] font-bold text-muted-foreground">
                      가격대 {priceLevel}
                    </p>
                  ) : null}
                  {item.productName && item.productName !== item.name && (
                    <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                      {item.productName}
                    </p>
                  )}
                </div>
              </div>

              {(typeof item.rating === "number" ||
                typeof item.reviewCount === "number") && (
                <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
                  {typeof item.rating === "number" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1.5 text-amber-700 dark:text-amber-300">
                      <Star className="size-4 fill-current" />
                      {item.rating.toFixed(1)}
                    </span>
                  )}
                  {typeof item.reviewCount === "number" && (
                    <span className="rounded-full bg-muted px-3 py-1.5">
                      후기 {item.reviewCount.toLocaleString("ko-KR")}개
                    </span>
                  )}
                </div>
              )}

              {item.address && (
                <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  {item.address}
                </p>
              )}

              {item.fitChecks?.length ? (
                <FitChecklist checks={item.fitChecks} />
              ) : (
                <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-muted-foreground">
                  {item.reason}
                </p>
              )}

              <AxisBreakdown scores={item.scores} />

              <details className="group mt-3">
                <summary className="cursor-pointer list-none text-[13px] font-bold text-muted-foreground underline underline-offset-4">
                  왜 이 후보를 골랐나요?
                </summary>
                <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-muted-foreground">
                  {item.fitChecks?.length ? (
                    <p className="leading-relaxed">{item.reason}</p>
                  ) : null}
                  {recommendationEvidence(item).map((evidence) => (
                    <p
                      key={`${item.name}-detail-${evidence.label}`} className="flex items-start gap-2"
                    >
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        <strong className="text-foreground">
                          {evidence.label}
                        </strong>
                        <span className="block">{evidence.text}</span>
                      </span>
                    </p>
                  ))}
                </div>
              </details>

              {/* 카드 높이가 제각각이어도 구매 버튼은 같은 선에 오도록 바닥에 붙인다. */}
              {item.sourceUrl && (
                <div className="mt-auto pt-4">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    onClick={() =>
                      trackOutboundClick({
                        categoryId: data.categoryId,
                        selectionType: item.selectionType,
                        name: item.name,
                        keyword: item.searchKeyword,
                        position: index + 1,
                      })
                    } className={cn(
                      "flex min-h-[48px] w-full items-center justify-center rounded-lg px-3 text-center text-[15px] font-black transition",
                      isFood
                        ? "border border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        : isCoupang
                          ? "bg-[#ae0000] text-white hover:bg-[#8f0000]"
                          : "border border-[#03c75a] text-[#03c75a] hover:bg-[#03c75a]/5"
                    )}
                  >
                    {item.sourceLabel ||
                      (isFood
                        ? "지도에서 최신 정보 보기"
                        : isCoupang
                          ? "쿠팡에서 최저가 확인"
                          : "네이버에서 조건 확인")}
                    <ExternalLink className="ml-2 size-4 shrink-0" />
                  </a>
                  {isCoupang && (
                    <p className="mt-1.5 truncate text-center text-[11px] text-muted-foreground">
                      검색어 &lsquo;{item.searchKeyword}&rsquo;
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {recommendations.length === 0 && (
        <div className="mt-8 rounded-2xl border border-destructive/25 bg-destructive/5 p-7 text-center">
          <p className="font-bold">추천 후보를 불러오지 못했어요.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            빈 화면 대신 이전 화면에서 조건을 다시 선택할 수 있어요.
          </p>
        </div>
      )}

      <section className="mt-6 rounded-2xl border bg-background/70 p-4 text-xs leading-relaxed text-muted-foreground">
        {isFood ? (
          hasLivePlaces ? (
            <p>
              현재 위치 주변의 지도 평점·후기 수와 가격대를 반영했습니다. 실제
              메뉴 가격과 영업 상태는 방문 전에 다시 확인하세요.
            </p>
          ) : (
            <p>
              실시간 음식점 평점 연동이 없어 지도 검색 후보를 제공합니다. 지도에서
              거리·평점·최근 후기를 확인해 주세요.
            </p>
          )
        ) : isAdvisory ? (
          <p>
            이 분야는 판매처를 연결하지 않습니다. 위 정리는 판단 방향을 좁히기
            위한 참고이며, 실제 계약 조건은 사업자에게 직접 확인해야 합니다.
          </p>
        ) : !isCoupang ? (
          <p>
            예약 가능 여부, 취소·환불 규정, 최종 비용은 이동한 페이지에서 직접
            확인해 주세요.
          </p>
        ) : hasLivePrice ? (
          <p>
            표시 가격은 외부 쇼핑 검색의 조회 시점 참고가입니다. 구매 버튼은
            쿠팡 파트너스 링크로 이동하며, 배송비·쿠폰·옵션·재고에 따라 쿠팡의
            최종 결제가는 달라질 수 있습니다.
          </p>
        ) : (
          <p>
            실시간 참고가를 불러오지 못했습니다. 쿠팡에서 현재 가격과 판매
            조건을 확인해 주세요.
          </p>
        )}
      </section>

      {isAdvisory && data.advisory && (
        <section className="mt-7 rounded-2xl border-l-4 border-amber-500 bg-amber-50/60 p-5 dark:bg-amber-950/25">
          <p className="text-[13px] font-black text-amber-900 dark:text-amber-200">
            결정 전에 꼭 확인하세요
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-amber-900/85 dark:text-amber-100/85">
            {data.advisory}
          </p>
          <p className="mt-4 border-t border-amber-500/20 pt-3 text-[12px] text-amber-900/70 dark:text-amber-100/60">
            ChoiceFlow는 이 분야에서 판매·중개를 하지 않습니다. 판단에 도움이 되는
            정리만 제공합니다.
          </p>
        </section>
      )}

      {isFood && relatedKeyword && (
        <section className="mt-6 rounded-2xl border border-[#ae0000]/20 bg-[#ae0000]/[0.04] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-[#ae0000]" />
            <h2 className="font-display text-lg font-black">
              집에서 준비한다면
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            밖에 나가기 애매한 날이라면 재료나 밀키트로 해결하는 방법도 있어요.
          </p>
          <a
            href={buildDirectCoupangNpSearchUrl(relatedKeyword)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() =>
              trackOutboundClick({
                categoryId: data.categoryId,
                selectionType: "related",
                name: relatedKeyword,
                keyword: relatedKeyword,
                position: 90,
              })
            } className={cn(
              buttonVariants({ variant: "default" }),
              "mt-4 min-h-[52px] w-full rounded-2xl bg-[#ae0000] text-[15px] font-black text-white hover:bg-[#8f0000]"
            )}
          >
            &lsquo;{relatedKeyword}&rsquo; 쿠팡에서 보기
            <ExternalLink className="ml-2 size-4" />
          </a>
        </section>
      )}




      <section className="mt-16 overflow-hidden rounded-[2rem] bg-[#f1f0ec] p-6 sm:mt-24 sm:p-10">
        {!showAdvanced ? (
          <>
            <div className="flex size-11 items-center justify-center rounded-full bg-foreground text-background">
              <Sparkles className="size-5" />
            </div>
            <p className="mt-7 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Refine your choice</p>
            <h2 className="mt-3 max-w-xl text-[32px] font-black leading-[1.02] tracking-[-0.05em] sm:text-[48px]">조금 더 까다롭게 골라볼까요?</h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
              질문을 원하는 만큼 더 답하면 사용 환경과 취향, 꼭 필요한 조건까지
              결과에 반영합니다.
            </p>
            <Button
              type="button" className="mt-7 min-h-[52px] w-full rounded-full bg-foreground text-background hover:bg-foreground/85 sm:w-auto sm:px-8"
              disabled={!canRefine || !aiAvailable}
              onClick={() => {
                setRefineError("");
                setShowAdvanced(true);
              }}
            >
              질문 5개 더 답하고 정밀 추천받기
            </Button>
            {!canRefine && (
              <p className="mt-3 text-xs text-muted-foreground">
                이전 형식의 결과입니다. 새 추천을 시작하면 정밀 질문을 사용할 수
                있어요.
              </p>
            )}
            {canRefine && !aiAvailable && (
              <p className="mt-3 text-xs text-muted-foreground">
                지금은 AI 추천 서버에 연결되지 않아 기본 후보만 보여드리고
                있어요. 질문을 더 답해도 결과가 달라지지 않아 잠시 잠가 두었습니다.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button" className="inline-flex size-10 items-center justify-center rounded-full border bg-background/80"
                aria-label="정밀 추천 닫기"
                onClick={() => setShowAdvanced(false)}
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="text-xs font-bold text-muted-foreground">
                정밀 질문 {questionIndex + 1} / {advancedQuestions.length}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {advancedQuestions.map((item, index) => (
                <span
                  key={item.id} className={cn(
                    "h-1 rounded-full",
                    index <= questionIndex ? "bg-primary" : "bg-primary/15"
                  )}
                />
              ))}
            </div>

            {question && (
              <div className="mt-6">
                <h2 className="text-balance text-2xl font-black tracking-tight">
                  {question.label}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {question.description}
                </p>
                <div className="mt-5 grid gap-2">
                  {question.options.map((option) => {
                    const selected = answers.some(
                      (answer) =>
                        answer.questionId === question.id &&
                        answer.optionId === option.id
                    );
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={isRefining}
                        onClick={() => selectAdvancedOption(question.id, option)} className={cn(
                          "flex min-h-14 items-center justify-between rounded-2xl border bg-background/80 px-4 text-left text-sm font-bold transition hover:border-foreground/25",
                          selected &&
                            "border-primary bg-primary text-primary-foreground"
                        )}
                      >
                        {option.label}
                        {selected && <Check className="size-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {questionIndex > 0 && (
                <Button
                  type="button"
                  variant="outline" className="min-h-12 rounded-xl"
                  disabled={isRefining}
                  onClick={() => setQuestionIndex((current) => current - 1)}
                >
                  이전 질문
                </Button>
              )}
              <Button
                type="button" className="min-h-12 rounded-xl"
                disabled={answers.length === 0 || isRefining}
                onClick={() => void submitRefinement()}
              >
                {isRefining && <Loader2 className="mr-2 size-4 animate-spin" />}
                {answers.length === advancedQuestions.length
                  ? "정밀 추천 결과 보기"
                  : `현재 ${answers.length}개 답변으로 결과 보기`}
              </Button>
            </div>
            {refineError && (
              <p
                role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive"
              >
                {refineError}
              </p>
            )}
          </>
        )}
      </section>

      <ShareResultButton result={data} className="mt-7" />

      <div className="mt-3">
        <Link
          href="/" className={cn(
            buttonVariants({ variant: "outline" }),
            "min-h-12 w-full rounded-full"
          )}
        >
          <RotateCcw className="mr-2 size-4" />
          처음부터 다시 추천받기
        </Link>
      </div>
    </main>
  );
}
