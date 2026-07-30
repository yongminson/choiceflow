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
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
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

const ROLE_STYLES: Record<
  NonNullable<QuickRecommendation["selectionType"]>,
  string
> = {
  best: "border-primary/45 bg-primary/10 text-primary",
  value: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  reliable: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  premium: "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

const FALLBACK_ROLE_LABELS = [
  "최종 선택",
  "최저가·가성비",
  "검증 우선",
  "프리미엄",
];

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

export function QuickRecommendationResult({
  data,
  onResultUpdate,
}: {
  data: AnalyzeApiResult;
  onResultUpdate: (result: AnalyzeApiResult) => void;
}) {
  const recommendations = (data.quickRecommendations || []).slice(0, 3);
  const winner = recommendations[0];
  const alternative = recommendations[1];
  const isFood = data.categoryId === "food";
  const hasLivePrice = data.providerStatus?.price === "live";
  const hasLivePlaces = data.providerStatus?.places === "live";
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
    <main className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-14">
      <header className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
          ChoiceFlow recommendation
        </p>
        <p className="mt-5 text-sm font-bold text-muted-foreground">
          선택한 조건으로 고른 첫 번째 후보
        </p>
        <h1 className="mt-2 text-balance bg-gradient-to-br from-primary via-sky-500 to-violet-500 bg-clip-text font-display text-4xl font-black tracking-[-0.05em] text-transparent sm:text-5xl">
          {winner?.name || `${data.quickScenarioLabel} 추천`}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {winner?.reason ||
            "선택한 조건을 기준으로 가장 적합한 후보를 정리했어요."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {data.quickPriorityLabel && (
            <span className="rounded-full border border-foreground/10 bg-background/80 px-3 py-1.5 text-xs font-bold">
              {data.quickPriorityLabel} 우선
            </span>
          )}
          {data.quickBudgetLabel && (
            <span className="rounded-full border border-foreground/10 bg-background/80 px-3 py-1.5 text-xs font-bold">
              {data.quickBudgetLabel}
            </span>
          )}
          {Boolean(data.refinementAnswerCount) && (
            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300">
              정밀 조건 {data.refinementAnswerCount}개 반영
            </span>
          )}
        </div>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-sky-200/70 bg-white/80 p-5 shadow-glass-sm backdrop-blur-xl">
          <p className="text-sm font-bold text-primary">이번 추천에 반영</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed">
            {[data.quickScenarioLabel, data.quickPriorityLabel, data.quickBudgetLabel]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {Boolean(data.refinementAnswerCount) && (
            <p className="mt-2 text-xs text-muted-foreground">
              정밀 조건 {data.refinementAnswerCount}개까지 반영했어요.
            </p>
          )}
        </div>
        <div className="rounded-3xl border border-emerald-200/70 bg-white/80 p-5 shadow-glass-sm backdrop-blur-xl">
          <p className="text-sm font-bold text-emerald-700">데이터 확인 수준</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed">
            {isFood
              ? hasLivePlaces
                ? "실제 주변 음식점 · 평점 · 후기 확인"
                : "메뉴 아이디어만 제공 · 실제 매장은 지도 확인 필요"
              : hasLivePrice
                ? "외부 참고 가격 확인 · 쿠팡 가격은 이동 후 확인"
                : "후보 비교 완료 · 판매 가격은 쿠팡에서 확인"}
          </p>
          {data.recommendationContext?.length ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {data.recommendationContext.join(" · ")}
            </p>
          ) : null}
        </div>
      </section>

      {winner && alternative && (
        <section className="mt-6 overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-glass-sm backdrop-blur-xl">
          <div className="border-b border-foreground/10 px-5 py-4 text-center">
            <h2 className="font-display text-lg font-black">
              두 후보를 다른 관점에서 비교
            </h2>
          </div>
          <div className="grid grid-cols-2">
            {[winner, alternative].map((item, index) => (
              <div
                key={`${item.name}-summary`}
                className={cn(
                  "min-w-0 p-4 sm:p-6",
                  index === 1 && "border-l border-foreground/10"
                )}
              >
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                    index === 0
                      ? "bg-primary/10 text-primary"
                      : "bg-emerald-500/10 text-emerald-700"
                  )}
                >
                  {index === 0 ? "가장 잘 맞는 후보" : "다른 관점의 대안"}
                </span>
                <h3 className="mt-3 break-keep text-base font-black sm:text-lg">
                  {item.name}
                </h3>
                {typeof item.price === "number" && (
                  <p className="mt-2 text-sm font-black text-emerald-700">
                    참고 {formatPrice(item.price)}원
                  </p>
                )}
                <div className="mt-4 space-y-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {recommendationEvidence(item)
                    .slice(0, 2)
                    .map((evidence) => (
                      <p
                        key={`${item.name}-${evidence.label}`}
                        className="flex items-start gap-2"
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
              </div>
            ))}
          </div>
        </section>
      )}

      {winner && (
        <section className="mt-6 rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/95 via-white/90 to-orange-50/90 p-6 shadow-glass-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            핵심 판단
          </p>
          <p className="mt-3 text-[15px] font-medium leading-relaxed">
            {data.killerInsight || winner.reason}
          </p>
          <p className="mt-4 border-t border-amber-200/70 pt-4 text-sm font-bold">
            {data.summary}
          </p>
        </section>
      )}

      <div className="mb-4 mt-9 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-muted-foreground">추천 후보</p>
          <h2 className="mt-1 font-display text-2xl font-black">
            목적별 최대 3개
          </h2>
        </div>
      </div>

      <div className="space-y-4">
        {recommendations.map((item, index) => {
          const priceLevel = formatPriceLevel(item.priceLevel);
          const roleLabel =
            item.selectionLabel || FALLBACK_ROLE_LABELS[index] || "추천";
          const roleStyle = item.selectionType
            ? ROLE_STYLES[item.selectionType]
            : ROLE_STYLES.best;
          return (
            <article
              key={`${item.selectionType || index}-${item.name}`}
              className={cn(
                "overflow-hidden rounded-3xl border bg-white/60 p-5 shadow-glass-sm backdrop-blur-xl dark:bg-white/[0.07] sm:p-6",
                index === 0
                  ? "border-primary/50 ring-2 ring-primary/15"
                  : "border-white/40 dark:border-white/10"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-xs font-bold",
                      roleStyle
                    )}
                  >
                    {roleLabel}
                  </span>
                  <h2 className="mt-3 break-keep text-xl font-black leading-tight">
                    {item.name}
                  </h2>
                </div>
                <span className="shrink-0 text-2xl font-black text-primary/25">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              {(typeof item.price === "number" || priceLevel) && (
                <div className="mt-4 rounded-2xl bg-emerald-500/10 p-4">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {item.priceLabel || "가격대"}
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-200">
                    {typeof item.price === "number"
                      ? `${formatPrice(item.price)}원`
                      : priceLevel}
                  </p>
                  {item.seller && (
                    <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-200/75">
                      판매처 {item.seller}
                    </p>
                  )}
                </div>
              )}

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

              <p className="mt-4 text-[15px] font-medium leading-relaxed">
                {item.reason}
              </p>

              <details className="group mt-4 rounded-2xl border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <summary className="cursor-pointer list-none text-sm font-bold">
                  왜 이 후보를 골랐나요?
                </summary>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {recommendationEvidence(item).map((evidence) => (
                    <p
                      key={`${item.name}-detail-${evidence.label}`}
                      className="flex items-start gap-2"
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

              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className={cn(
                    buttonVariants({
                      variant: index === 0 ? "default" : "outline",
                    }),
                    "mt-4 min-h-12 w-full rounded-xl"
                  )}
                >
                  {item.sourceLabel ||
                    (isFood ? "지도에서 최신 정보 보기" : "가격·판매 조건 확인")}
                  <ExternalLink className="ml-2 size-4" />
                </a>
              )}
            </article>
          );
        })}
      </div>

      {recommendations.length === 0 && (
        <div className="mt-8 rounded-3xl border border-destructive/25 bg-destructive/5 p-7 text-center">
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

      {!isFood && (
        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
        </p>
      )}

      <section className="mt-8 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] to-sky-500/[0.06] p-5 sm:p-6">
        {!showAdvanced ? (
          <>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-foreground text-background">
              <Sparkles className="size-5" />
            </div>
            <h2 className="mt-4 text-xl font-black">결과가 애매한가요?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              질문을 원하는 만큼 더 답하면 사용 빈도, 공간, A/S와 유지비까지
              반영합니다.
            </p>
            <Button
              type="button"
              className="mt-5 min-h-12 w-full rounded-xl"
              disabled={!canRefine}
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
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-full border bg-background/80"
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
                  key={item.id}
                  className={cn(
                    "h-1 rounded-full",
                    index <= questionIndex ? "bg-foreground" : "bg-foreground/10"
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
                        onClick={() => selectAdvancedOption(question.id, option)}
                        className={cn(
                          "flex min-h-14 items-center justify-between rounded-2xl border bg-background/80 px-4 text-left text-sm font-bold transition hover:border-foreground/25",
                          selected &&
                            "border-foreground bg-foreground text-background"
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
                  variant="outline"
                  className="min-h-12 rounded-xl"
                  disabled={isRefining}
                  onClick={() => setQuestionIndex((current) => current - 1)}
                >
                  이전 질문
                </Button>
              )}
              <Button
                type="button"
                className="min-h-12 rounded-xl"
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
                role="alert"
                className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive"
              >
                {refineError}
              </p>
            )}
          </>
        )}
      </section>

      <div className="mt-7">
        <Link
          href="/"
          className={cn(
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
