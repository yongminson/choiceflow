"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { GuardrailRejectedModal } from "@/components/analyze/guardrail-rejected-modal";
import { DilemmaStepOneForm } from "@/components/start/dilemma-step-one-form";
import { SajuImportButton } from "@/components/start/saju-import-button";
import { useBilling } from "@/components/payment/billing-provider";
import { parseManwonPriceInput } from "@/lib/analyze/parse-manwon-price";
import { readFilesAsDataUrls } from "@/lib/utils/file-to-data-url";
import { ANALYZE_GUARDRAIL_DEFAULT_REASON } from "@/lib/analyze/guardrail";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SITUATION_MIN = 10;

// 🔥 로딩 중에 보여줄 멘트 리스트
const LOADING_TEXTS = [
  "10만 건의 실사용자 빅데이터를 스캔하고 있습니다...",
  "옵션 A와 B의 가성비와 장단점을 비교 중입니다...",
  "결정적인 제3의 대안(Option C)을 탐색하는 중입니다...",
  "최종 리포트를 생성하고 있습니다. 잠시만 기다려주세요!"
];

export function StartPageView() {
  const router = useRouter();
  const { openBilling } = useBilling();

  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [filesA, setFilesA] = useState<File[]>([]);
  const [filesB, setFilesB] = useState<File[]>([]);
  const [priceAManwonText, setPriceAManwonText] = useState("");
  const [priceBManwonText, setPriceBManwonText] = useState("");
  const [situationReason, setSituationReason] = useState("");
  const [usagePeriod, setUsagePeriod] = useState("1y-3y");
  const [priority, setPriority] = useState("design");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [guardrailOpen, setGuardrailOpen] = useState(false);
  const [guardrailReason, setGuardrailReason] = useState("");
  
  // 🔥 로딩 텍스트 인덱스 상태
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  // 🔥 분석 중일 때 3초마다 로딩 멘트 변경
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setLoadingTextIndex(0);
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  async function handleSubmit() {
    const a = optionA.trim();
    const b = optionB.trim();
    if (!a || !b) {
      toast.error("A 옵션과 B 옵션을 모두 입력해 주세요.");
      return;
    }

    const situation = situationReason.trim();
    if (situation.length < SITUATION_MIN) {
      toast.error(
        `"나의 현재 상황 및 고민의 이유"는 ${SITUATION_MIN}자 이상 입력해 주세요.`
      );
      return;
    }

    const priceAManwon = parseManwonPriceInput(priceAManwonText);
    const priceBManwon = parseManwonPriceInput(priceBManwonText);
    if (priceAManwon <= 0 || priceBManwon <= 0) {
      toast.error("A·B 옵션 예상 가격을 각각 0보다 큰 값으로 입력해 주세요.");
      return;
    }

    setIsAnalyzing(true);

    let categoryId: string | undefined;
    let contextNotes: string | undefined;
    let myeongunDeepDataEnabled: boolean | undefined;

    try {
      try {
        const draftRaw = sessionStorage.getItem("choiceflow-dashboard-draft");
        if (draftRaw) {
          const parsed = JSON.parse(draftRaw) as {
            categoryId?: string;
            myeongunDeepDataEnabled?: boolean;
          };
          categoryId = parsed.categoryId;
          myeongunDeepDataEnabled = parsed.myeongunDeepDataEnabled;
          contextNotes =
            draftRaw.length > 14_000
              ? draftRaw.slice(0, 14_000) + "…"
              : draftRaw;
        }
      } catch {
        /* ignore */
      }

      const images = await readFilesAsDataUrls([...filesA, ...filesB]);

      const requestPayload = {
        optionA: a,
        optionB: b,
        priceAManwon,
        priceBManwon,
        situationReason: situation,
        budgetManwon: Math.round((priceAManwon + priceBManwon) / 2),
        usagePeriod,
        priority,
        categoryId,
        contextNotes,
        myeongunDeepDataEnabled: myeongunDeepDataEnabled === true,
        images,
      };

      let res: Response;
      let data: Record<string, unknown> = {};
      try {
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
          credentials: "same-origin",
          cache: "no-store",
        });
        try {
          data = (await res.json()) as Record<string, unknown>;
        } catch {
          data = {};
        }
      } catch (e) {
        console.error(e);
        toast.error(
          "네트워크 오류로 분석을 완료하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요."
        );
        return;
      }

      if (!res.ok || data.ok !== true) {
        if (data.status === "REJECTED") {
          const reason =
            typeof data.reason === "string" && data.reason.trim()
              ? data.reason.trim()
              : ANALYZE_GUARDRAIL_DEFAULT_REASON;
          setGuardrailReason(reason);
          setGuardrailOpen(true);
          return;
        }
        const msg =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "분석에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        const lowCredit = res.status === 402 || msg.includes("크레딧");
        if (lowCredit) {
          toast.error(msg, {
            action: {
              label: "크레딧 충전하기",
              onClick: () => openBilling(),
            },
          });
        } else {
          toast.error(msg);
        }
        return;
      }

      const { ok: _ok, ...rest } = data;
      void _ok;

      try {
        sessionStorage.setItem("choiceResult", JSON.stringify(rest));
      } catch (storageErr) {
        console.error(storageErr);
        toast.error("결과를 저장할 수 없습니다. 브라우저 설정을 확인해 주세요.");
        return;
      }

      router.push("/result");
    } catch (err) {
      console.error(err);
      toast.error("일시적인 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full flex-1 flex-col justify-center px-6 py-12 sm:px-8 sm:py-16">
      
      {/* 🔥 VVIP 글래스모피즘 로딩 오버레이 */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center rounded-3xl border border-border/50 bg-background/90 p-8 sm:p-12 shadow-2xl backdrop-blur-xl text-center max-w-[90vw]">
            <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/10 mb-6">
              {/* 회전하는 링 */}
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              {/* 반짝이는 아이콘 */}
              <Sparkles className="size-6 text-primary animate-pulse" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-3">
              AI 심층 분석 중
            </h3>
            <p className="min-h-[1.5rem] text-[14px] sm:text-[15px] font-medium text-muted-foreground animate-pulse transition-all duration-500">
              {LOADING_TEXTS[loadingTextIndex]}
            </p>
          </div>
        </div>
      )}

      <GuardrailRejectedModal
        open={guardrailOpen}
        reason={guardrailReason}
        onRetry={() => setGuardrailOpen(false)}
      />
      
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ms-2 mb-8 inline-flex h-9 items-center gap-1 rounded-full px-2 text-[13px] text-muted-foreground hover:text-foreground"
          )}
        >
          <ChevronLeft className="size-4" aria-hidden />
          홈
        </Link>

        <div className="flex flex-col items-center text-center">
          <h1 className="max-w-[22ch] text-balance text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl sm:leading-[1.15]">
            당신의 고민을 알려주세요
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            비교할 두 옵션과 조건을 입력하면 AI가 분석을 시작합니다.
          </p>
        </div>

        <div className="mt-12 rounded-[1.75rem] border border-border/60 bg-card/85 p-7 shadow-sm backdrop-blur-sm sm:p-10">
          <div className="mb-6 flex justify-end">
            <SajuImportButton />
          </div>
          <DilemmaStepOneForm
            optionA={optionA}
            optionB={optionB}
            onOptionAChange={setOptionA}
            onOptionBChange={setOptionB}
            filesA={filesA}
            filesB={filesB}
            onFilesAChange={setFilesA}
            onFilesBChange={setFilesB}
            priceAManwonText={priceAManwonText}
            priceBManwonText={priceBManwonText}
            onPriceAChange={setPriceAManwonText}
            onPriceBChange={setPriceBManwonText}
            situationReason={situationReason}
            onSituationReasonChange={setSituationReason}
            usagePeriod={usagePeriod}
            onUsagePeriodChange={setUsagePeriod}
            priority={priority}
            onPriorityChange={setPriority}
            isAnalyzing={isAnalyzing}
            onAnalyze={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}