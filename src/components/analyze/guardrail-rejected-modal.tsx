"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GuardrailRejectedModalProps = {
  open: boolean;
  reason: string;
  onRetry: () => void;
};

export function GuardrailRejectedModal({
  open,
  reason,
  onRetry,
}: GuardrailRejectedModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guardrail-rejected-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="닫기"
        onClick={onRetry}
      />
      <div
        className={cn(
          "relative z-[101] w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl",
          "dark:border-white/15 dark:bg-card"
        )}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <h2
              id="guardrail-rejected-title"
              className="font-display text-lg font-semibold tracking-tight text-foreground"
            >
              분석을 진행할 수 없습니다
            </h2>
            <p className="text-pretty text-[15px] leading-relaxed text-muted-foreground">
              {reason}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            className="min-h-11 rounded-xl px-6 font-semibold"
            onClick={onRetry}
          >
            다시 입력하기
          </Button>
        </div>
      </div>
    </div>
  );
}
