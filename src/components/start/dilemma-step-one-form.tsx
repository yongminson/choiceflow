"use client";

import { Loader2 } from "lucide-react";

import { AbOptionFields } from "@/components/start/dilemma/ab-option-fields";
import { PreferenceFields } from "@/components/start/dilemma/preference-fields";
import { Button } from "@/components/ui/button";

export type DilemmaStepOneFormProps = {
  optionA: string;
  optionB: string;
  onOptionAChange: (v: string) => void;
  onOptionBChange: (v: string) => void;
  filesA: File[];
  filesB: File[];
  onFilesAChange: (files: File[]) => void;
  onFilesBChange: (files: File[]) => void;
  priceAManwonText: string;
  priceBManwonText: string;
  onPriceAChange: (v: string) => void;
  onPriceBChange: (v: string) => void;
  situationReason: string;
  onSituationReasonChange: (v: string) => void;
  usagePeriod: string;
  onUsagePeriodChange: (v: string) => void;
  priority: string;
  onPriorityChange: (v: string) => void;
  isAnalyzing: boolean;
  onAnalyze: () => void | Promise<void>;
  /** 카테고리 없는 일반 플로우는 1 */
  expectedCredits?: number;
};

export function DilemmaStepOneForm({
  optionA,
  optionB,
  onOptionAChange,
  onOptionBChange,
  filesA,
  filesB,
  onFilesAChange,
  onFilesBChange,
  priceAManwonText,
  priceBManwonText,
  onPriceAChange,
  onPriceBChange,
  situationReason,
  onSituationReasonChange,
  usagePeriod,
  onUsagePeriodChange,
  priority,
  onPriorityChange,
  isAnalyzing,
  onAnalyze,
  expectedCredits = 1,
}: DilemmaStepOneFormProps) {
  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void onAnalyze();
  }

  return (
    <form className="space-y-10" onSubmit={handleFormSubmit}>
      <AbOptionFields
        optionA={optionA}
        optionB={optionB}
        onOptionAChange={onOptionAChange}
        onOptionBChange={onOptionBChange}
        filesA={filesA}
        filesB={filesB}
        onFilesAChange={onFilesAChange}
        onFilesBChange={onFilesBChange}
        disabled={isAnalyzing}
      />

      <div className="h-px w-full bg-border/50" />

      <PreferenceFields
        priceAManwonText={priceAManwonText}
        priceBManwonText={priceBManwonText}
        onPriceAChange={onPriceAChange}
        onPriceBChange={onPriceBChange}
        situationReason={situationReason}
        onSituationReasonChange={onSituationReasonChange}
        usagePeriod={usagePeriod}
        onUsagePeriodChange={onUsagePeriodChange}
        priority={priority}
        onPriorityChange={onPriorityChange}
        disabled={isAnalyzing}
      />

      <div className="flex flex-col items-center gap-3 pt-2">
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
          type="submit"
          size="lg"
          disabled={isAnalyzing}
          className="h-12 min-w-[240px] rounded-full px-10 text-[15px] font-medium shadow-sm"
        >
          {isAnalyzing ? (
            <>
              <Loader2
                className="me-2 size-5 animate-spin opacity-90"
                aria-hidden
              />
              AI가 심층 분석 중입니다...
            </>
          ) : (
            "다음 단계로"
          )}
        </Button>
      </div>
    </form>
  );
}
