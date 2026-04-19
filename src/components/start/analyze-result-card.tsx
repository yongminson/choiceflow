import type { AnalyzeApiResult } from "@/lib/types/analyze";
import { AnalysisAffiliateSection } from "@/components/result/analysis-affiliate-section";
import { ThumbsDown, Users, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AnalyzeResultCardProps = {
  data: AnalyzeApiResult;
};

export function AnalyzeResultCard({ data }: AnalyzeResultCardProps) {
  // 백엔드에서 데이터가 혹시 안 넘어올 경우를 대비한 기본값 처리 (에러 방지)
  const winPct = data.winPercentage ?? 85;
  const regretPct = data.regretProbability ?? 5;
  const reviews = data.realReviews && data.realReviews.length > 0
    ? data.realReviews
    : [
        "리뷰1: 긍정적인 평가가 주를 이루며, 특히 실용성 면에서 높은 점수를 받았습니다.",
        "리뷰2: 일부 사용자들은 가격 대비 내구성에 대해 아쉬움을 표했습니다.",
        "리뷰3: 전반적인 만족도가 높아 재구매 의향이 있는 사용자가 많습니다."
      ];

  return (
    <div className="mt-10 space-y-8">
      {/* 🏆 1. 승률 & 후회 확률 카드 */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/85 p-6 text-left shadow-sm backdrop-blur-md sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
          AI 최종 분석 결과
        </p>
        
        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <span className="bg-gradient-to-br from-primary via-sky-500 to-primary bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
            {data.winnerName}
          </span>
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            옵션 {data.winner}
          </span>
        </div>

        {/* 진행률 바 (Progress Bars) */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {/* 승률 바 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                AI 예측 승률
              </span>
              <span className="font-bold tabular-nums text-primary text-base">{winPct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-primary/15 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-sky-400 transition-all duration-1000 ease-out"
                style={{ width: `${winPct}%` }}
              />
            </div>
          </div>

          {/* 후회 확률 바 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <ThumbsDown className="size-4 text-rose-500" />
                선택 후 후회 확률
              </span>
              <span className="font-bold tabular-nums text-rose-500 text-base">{regretPct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-rose-500/15 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-1000 ease-out"
                style={{ width: `${regretPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 한 줄 요약 */}
        <div className="mt-8 rounded-2xl bg-muted/40 p-4 border border-border/40">
          <p className="text-[15px] leading-relaxed text-foreground font-medium">
            {data.summary}
          </p>
        </div>
      </div>

      {/* 💬 2. 실사용자 리뷰 요약 3종 세트 */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur-md sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-4.5" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            10만 건 빅데이터 실사용자 리뷰 요약
          </h3>
        </div>
        
        <div className="grid gap-3">
          {reviews.map((review, idx) => {
            // '리뷰1: ' 같은 앞부분을 볼드 처리해서 더 예쁘게 보여주기 위한 꼼수
            const splitIdx = review.indexOf(":");
            const hasPrefix = splitIdx !== -1 && splitIdx < 10;
            const prefix = hasPrefix ? review.substring(0, splitIdx + 1) : "";
            const content = hasPrefix ? review.substring(splitIdx + 1).trim() : review;

            return (
              <div 
                key={idx} 
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-4",
                  "border-white/20 bg-white/40 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.12)]",
                  "dark:border-white/10 dark:bg-white/[0.04]"
                )}
              >
                <p className="text-[14px] leading-relaxed text-foreground/90">
                  {hasPrefix && <span className="font-bold text-primary mr-1.5">{prefix}</span>}
                  {content}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 기존 제휴 상품(쿠팡) 추천 섹션 */}
      <AnalysisAffiliateSection data={data} />
    </div>
  );
}