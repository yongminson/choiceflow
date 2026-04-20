"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CategoryFormShellProps = {
  children: React.ReactNode;
  isAnalyzing: boolean;
  onAnalyze: () => void | Promise<void>;
  disabled?: boolean;
  // 🔥 myeongun 관련 프롭스 제거
  expectedCredits?: number;
};

export function CategoryFormShell({
  children,
  isAnalyzing,
  onAnalyze,
  disabled = false,
  expectedCredits = 1,
}: CategoryFormShellProps) {
  return (
    <div className="relative">
      <div className={cn(disabled && "pointer-events-none opacity-60")}>
        {children}
      </div>

      <div className="mt-10 flex flex-col items-center gap-6 border-t border-white/10 pt-10 dark:border-white/5">
        {/* ❌ 🔮 명운(命運) 체크박스 섹션 전체 삭제됨 */}

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