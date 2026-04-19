"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CategoryFormShellProps = {
  children: React.ReactNode;
  isAnalyzing: boolean;
  onAnalyze: () => void | Promise<void>;
  disabled?: boolean;
  myeongunOptIn: boolean;
  onMyeongunOptInChange: (value: boolean) => void;
  /** 이 카테고리 분석 시 차감될 크레딧 */
  expectedCredits?: number;
};

export function CategoryFormShell({
  children,
  isAnalyzing,
  onAnalyze,
  disabled = false,
  myeongunOptIn,
  onMyeongunOptInChange,
  expectedCredits = 1,
}: CategoryFormShellProps) {
  return (
    <div className="relative">
      <div className={cn(disabled && "pointer-events-none opacity-60")}>
        {children}
      </div>

      <div className="mt-10 flex flex-col items-center gap-6 border-t border-white/10 pt-10 dark:border-white/5">
        <label
          className={cn(
            "group flex w-full max-w-xl cursor-pointer items-start gap-3.5 rounded-2xl border border-white/25 bg-gradient-to-br from-white/[0.12] to-white/[0.04] px-4 py-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] transition-colors",
            "hover:border-primary/30 hover:bg-white/[0.08] dark:border-white/10 dark:from-white/[0.06] dark:to-transparent"
          )}
        >
          <input
            type="checkbox"
            checked={myeongunOptIn}
            onChange={(e) => onMyeongunOptInChange(e.target.checked)}
            disabled={disabled || isAnalyzing}
            className={cn(
              "mt-0.5 size-[18px] shrink-0 rounded-md border-white/35 bg-white/20 text-primary shadow-inner",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:border-white/25 dark:bg-white/10"
            )}
          />
          <span className="text-left text-[13px] font-medium leading-snug text-foreground sm:text-[14px]">
            🔮 명운(命運)의 심층 성향 데이터를 연동하여 더 확실한 추천 받기
          </span>
        </label>

        <p className="text-center text-[13px] text-muted-foreground sm:text-sm">
          예상 소모 크레딧:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {expectedCredits}
          </span>
          개
        </p>

        <p className="max-w-xl text-center text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
          모든 항목을 상세히 적을수록 AI의 분석 정확도가 기하급수적으로 올라갑니다.
        </p>

        <Button
          type="button"
          size="lg"
          disabled={disabled || isAnalyzing}
          className="min-h-[52px] min-w-[260px] rounded-full px-10 text-[16px] font-semibold shadow-glass-sm"
          onClick={() => void onAnalyze()}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="me-2 size-5 animate-spin" aria-hidden />
              AI가 심층 분석 중입니다...
            </>
          ) : (
            "AI 분석 시작하기"
          )}
        </Button>
      </div>
    </div>
  );
}
