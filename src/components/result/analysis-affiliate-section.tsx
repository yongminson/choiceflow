"use client";

import { ExternalLink, Headphones, ShoppingBag } from "lucide-react";

import type { AnalyzeApiResult } from "@/lib/types/analyze";
import { buildDirectCoupangNpSearchUrl } from "@/lib/monetization/coupang-search";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COUPANG_DISCLOSURE =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

const EXPERT_COPY =
  "더 자세한 상담은 전문가 연결을 통해 진행하실 수 있습니다.";

const DEFAULT_EXPERT_FORM =
  "https://forms.gle/YOUR_GOOGLE_FORM_LINK";

export function AnalysisAffiliateSection({ data }: { data: AnalyzeApiResult }) {
  const isAsset = data.categoryId === "asset";
  const rawKeyword =
    typeof data.searchKeyword === "string" ? data.searchKeyword.trim() : "";
  // 고가자산: API가 search_keyword를 내리지 않음 → 쿠팡 영역 미노출, 전문가만
  const keywordForCoupang = isAsset ? "" : rawKeyword;
  const hasSearchKeyword =
    typeof data.searchKeyword === "string" &&
    data.searchKeyword.trim().length > 0;
  const showCoupangBlock = !isAsset && hasSearchKeyword;
  const showExpertBlock = isAsset;

  if (!showCoupangBlock && !showExpertBlock) {
    return null;
  }

  const coupangHref = showCoupangBlock
    ? buildDirectCoupangNpSearchUrl(keywordForCoupang)
    : "";
  const expertFormHref =
    process.env.NEXT_PUBLIC_EXPERT_GOOGLE_FORM_URL?.trim() ??
    DEFAULT_EXPERT_FORM;

  return (
    <section
      className={cn(
        "relative mt-10 rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50/90 via-white/95 to-orange-50/80 p-6 shadow-sm",
        "dark:border-amber-900/30 dark:from-amber-950/40 dark:via-card/80 dark:to-orange-950/30 sm:p-8"
      )}
      aria-labelledby="affiliate-recommend-heading"
    >
      {/* 🔥 추가된 부분: 우측 상단에서 통통 튀는 선물 상자 (기존 코드 건드리지 않음) */}
      {!showExpertBlock && (
        <div className="absolute -top-5 -right-3 animate-bounce z-10 pointer-events-none">
          <span className="text-4xl drop-shadow-md">🎁</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <ShoppingBag className="size-5 text-amber-700 dark:text-amber-400" aria-hidden />
        <h2
          id="affiliate-recommend-heading"
          className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl"
        >
          {showExpertBlock ? "전문가 상담" : "추천 상품 확인하기"}
        </h2>
      </div>

      {showExpertBlock ? (
        <div className="mt-5 space-y-4">
          <p className="text-pretty text-[15px] leading-relaxed text-foreground/95">
            {EXPERT_COPY}
          </p>
          <a
            href={expertFormHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "default" }),
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-[15px] font-semibold sm:w-auto sm:min-w-[220px]"
            )}
          >
            <Headphones className="me-2 size-4" aria-hidden />
            전문가 상담 신청
          </a>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="text-pretty text-[14px] leading-relaxed text-muted-foreground">
            AI가 제안한 검색어로 쿠팡에서 바로 찾아볼 수 있어요.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href={coupangHref}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={cn(
                buttonVariants({ variant: "default" }),
                "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-[15px] font-semibold shadow-md"
              )}
            >
              <ExternalLink className="size-4 shrink-0" aria-hidden />
              추천 상품 확인하기
            </a>
            <span className="text-center text-[13px] text-muted-foreground sm:text-left">
              검색어:{" "}
              {keywordForCoupang.length > 56
                ? `${keywordForCoupang.slice(0, 56)}…`
                : keywordForCoupang}
            </span>
          </div>
        </div>
      )}

      {showCoupangBlock ? (
        <p
          className="mt-6 border-t border-amber-300 pt-5 text-[16px] sm:text-[17px] font-extrabold tracking-tight text-slate-900 dark:border-white/20 dark:text-white"
          role="note"
        >
          {COUPANG_DISCLOSURE}
        </p>
      ) : null}
    </section>
  );
}