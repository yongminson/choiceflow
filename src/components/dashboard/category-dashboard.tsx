"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react"; // 🔥 로딩 아이콘 추가

import { GuardrailRejectedModal } from "@/components/analyze/guardrail-rejected-modal";
import { CategoryFormShell } from "@/components/dashboard/category-form-shell";
import { CategoryPanelForm } from "@/components/dashboard/category-panel-forms";
import { useBilling } from "@/components/payment/billing-provider";
import { ANALYZE_GUARDRAIL_DEFAULT_REASON } from "@/lib/analyze/guardrail";
import { buildAnalyzeBodyFromDashboard } from "@/lib/analyze/build-dashboard-analyze-body";
import { getRequiredCreditsForAnalyze } from "@/lib/analyze/category-credits";
import { collectDashboardImageFiles } from "@/lib/dashboard/collect-dashboard-form-images";
import { serializeDashboardForms } from "@/lib/dashboard/serialize-dashboard-forms";
import { readFilesAsDataUrls } from "@/lib/utils/file-to-data-url";
import { validateDashboardForm } from "@/lib/dashboard/validate-dashboard-form";
import {
  CATEGORY_ORDER,
  type CategoryId,
  isCategoryId,
} from "@/lib/types/category";
import {
  initialDashboardForms,
  type DashboardFormsState,
} from "@/lib/types/dashboard-forms";
import { CATEGORY_3D_EMOJI } from "@/lib/emojis/category-3d-emoji";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<CategoryId, string> = {
  food: "뭐 먹을까?",
  gift: "선물상담",
  appliance: "홈&가전",
  fashion: "패션",
  date: "데이트/여행",
  asset: "고가자산",
};

const CATEGORY_DESC: Record<CategoryId, string> = {
  food: "뭐 먹을까?",
  gift: "관계와 예산에 맞는 선물을 좁혀 드려요.",
  appliance: "제품 스펙과 가성비를 나란히 비교해요.",
  fashion: "스타일·가격·핏을 한 번에 정리해요.",
  date: "여행·데이트 코스와 예산을 함께 정리해요.",
  asset: "리스크와 기간을 반영한 선택을 돕습니다.",
};

// 🔥 로딩 중에 보여줄 멘트 리스트
const LOADING_TEXTS = [
  "10만 건의 실사용자 빅데이터를 스캔하고 있습니다...",
  "선택하신 옵션의 가성비와 장단점을 비교 중입니다...",
  "결정적인 제3의 대안(Option C)을 탐색하는 중입니다...",
  "최종 리포트를 생성하고 있습니다. 잠시만 기다려주세요!"
];

// 🔥 MZ 감성 로딩 이모지 리스트 (표정이 바뀜)
const LOADING_EMOJIS = ["👀", "🤔", "💡", "🔍", "😉", "✨"];

function normalizeTab(raw: string | null): CategoryId {
  if (isCategoryId(raw)) return raw;
  return "gift";
}

export function CategoryDashboard() {
  const [loadingEmojiIndex, setLoadingEmojiIndex] = useState(0);
  const router = useRouter();
  const { openBilling } = useBilling();
  const searchParams = useSearchParams();
  const urlTab = useMemo(
    () => normalizeTab(searchParams.get("tab")),
    [searchParams]
  );

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>(urlTab);
  const [forms, setForms] = useState<DashboardFormsState>(() => initialDashboardForms());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [myeongunOptIn, setMyeongunOptIn] = useState(false);
  const [guardrailOpen, setGuardrailOpen] = useState(false);
  const [guardrailReason, setGuardrailReason] = useState("");

  // 🔥 로딩 텍스트 인덱스 상태
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  useEffect(() => {
    setSelectedCategory(urlTab);
  }, [urlTab]);

  useEffect(() => {
    if (searchParams.has("tab")) setIsFormOpen(true);
  }, [searchParams]);

  // 🔥 분석 중일 때 텍스트와 이모지 표정 변경 애니메이션
  useEffect(() => {
    let textInterval: NodeJS.Timeout;
    let emojiInterval: NodeJS.Timeout;
    if (isAnalyzing) {
      setLoadingTextIndex(0);
      setLoadingEmojiIndex(0);
      
      textInterval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
      }, 3000); // 텍스트는 3초마다

      emojiInterval = setInterval(() => {
        setLoadingEmojiIndex((prev) => (prev + 1) % LOADING_EMOJIS.length);
      }, 500); // 표정은 0.5초마다 빠르게 바뀜
    }
    return () => {
      clearInterval(textInterval);
      clearInterval(emojiInterval);
    };
  }, [isAnalyzing]);

  const expectedCredits = useMemo(
    () =>
      getRequiredCreditsForAnalyze(
        selectedCategory,
        selectedCategory === "appliance"
          ? forms.appliance.premiumSpaceAnalysis
          : undefined
      ),
    [selectedCategory, forms.appliance.premiumSpaceAnalysis]
  );

  const openCategory = useCallback(
    (id: CategoryId) => {
      setSelectedCategory(id);
      setIsFormOpen(true);
      router.replace(`/?tab=${id}`, { scroll: false });
    },
    [router]
  );

  const handleAnalyze = useCallback(async () => {
    const err = validateDashboardForm(selectedCategory, forms);
    if (err) {
      toast.error(err);
      return;
    }

    setIsAnalyzing(true);
    try {
      const draftPayload = {
        categoryId: selectedCategory,
        myeongunDeepDataEnabled: myeongunOptIn,
        forms: serializeDashboardForms(forms),
        savedAt: Date.now(),
      };
      try {
        sessionStorage.setItem("choiceflow-dashboard-draft", JSON.stringify(draftPayload));
      } catch (e) {
        console.error(e);
        toast.error("임시 저장에 실패했습니다. 브라우저 저장소를 확인해 주세요.");
        return;
      }

      const imageFiles = collectDashboardImageFiles(forms, selectedCategory);
      const images = await readFilesAsDataUrls(imageFiles);

      const analyzeBody = buildAnalyzeBodyFromDashboard(forms, selectedCategory, {
        myeongunDeepDataEnabled: myeongunOptIn,
        images,
      });

      let res: Response;
      let data: Record<string, unknown> = {};
      try {
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(analyzeBody),
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
        toast.error("네트워크 오류로 분석을 완료하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
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
    } catch (e) {
      console.error(e);
      toast.error("일시적인 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedCategory, forms, myeongunOptIn, router, openBilling]);

  const emojiAssets = CATEGORY_3D_EMOJI[selectedCategory];

  return (
    <section
      id="dashboard"
      className="relative mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6"
      aria-labelledby="genspark-main-title"
    >
      {/* 🔥 MZ 감성 통통 튀는 캐릭터 로딩 오버레이 */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-primary/20 bg-white/90 p-8 sm:p-12 shadow-[0_0_50px_rgba(0,0,0,0.1)] backdrop-blur-xl text-center max-w-[90vw] dark:bg-slate-900/90">
            
            {/* 통통 튀는 이모지 캐릭터 */}
            <div className="relative mb-6 flex size-24 items-center justify-center rounded-full bg-gradient-to-tr from-sky-100 to-indigo-100 shadow-inner dark:from-sky-900/40 dark:to-indigo-900/40">
              <span className="text-5xl animate-bounce drop-shadow-md">
                {LOADING_EMOJIS[loadingEmojiIndex]}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground mb-3">
              AI가 열일 중이에요! 🚀
            </h3>
            <p className="min-h-[1.5rem] text-[14px] sm:text-[15px] font-semibold text-primary animate-pulse transition-all duration-500">
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
      <div
        className={cn(
          "flex flex-col items-center justify-center px-1 text-center",
          isFormOpen
            ? "min-h-0 pt-8 sm:pt-10"
            : "min-h-[calc(100dvh-5.5rem)] sm:min-h-[calc(100dvh-6rem)]"
        )}
      >
        <h1
          id="genspark-main-title"
          className="font-display max-w-4xl text-balance text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.045em] text-foreground sm:text-4xl md:text-5xl md:leading-[1.08]"
        >
          어떤 선택이
          <span className="mt-1.5 block bg-gradient-to-br from-primary to-blue-600 bg-clip-text text-transparent dark:bg-none dark:text-white sm:mt-2.5">
  고민이신가요?
</span>
        </h1>

        <div
          className={cn(
            "mt-8 w-full max-w-[60rem] mx-auto sm:mt-9 md:mt-10",
            // 🔥 줄 바꿈을 예쁘게 하기 위해 그리드 컬럼 수를 조정합니다.
            "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-6 md:gap-3 lg:gap-4"
          )}
        >
          {CATEGORY_ORDER.map((id) => {
            const selected = selectedCategory === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => openCategory(id)}
                className={cn(
                  "flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 transition-all",
                  "sm:min-h-[4rem] sm:gap-1.5 sm:rounded-[1.5rem] sm:px-3 sm:py-3.5",
                  "md:min-h-[4.5rem] md:px-2 md:py-3 lg:min-h-[5rem] lg:px-3 lg:py-4",
                  "glass border border-white/40 bg-white/45 shadow-glass-sm backdrop-blur-md",
                  "hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass",
                  "active:scale-[0.98]",
                  "dark:border-white/12 dark:bg-white/[0.08]",
                  selected &&
                    "border-primary/50 bg-primary/14 ring-2 ring-primary/35 dark:bg-primary/18"
                )}
                aria-pressed={selected}
                aria-label={CATEGORY_LABELS[id]}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={CATEGORY_3D_EMOJI[id].mainSrc}
                  alt=""
                  width={56} // 🔥 기본 크기를 48에서 56으로 살짝 키웠습니다.
                  height={56}
                  // 🔥 id가 'food'일 때만 스케일을 살짝 키워 시각적 밸런스를 맞춥니다.
                  className={cn(
                    "shrink-0 object-contain select-none transition-transform",
                    id === "food" ? "size-14 sm:size-16 scale-110" : "size-12 sm:size-14"
                  )}
                  decoding="async"
                  loading="lazy"
                  aria-hidden
                />
                <span className="max-w-full mt-1 truncate px-1 text-center text-[12px] font-bold leading-tight text-foreground sm:text-[13px] md:text-[13px] lg:text-[14px]">
                  {CATEGORY_LABELS[id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isFormOpen && (
        <div
          className={cn(
            "mt-5 animate-in fade-in slide-in-from-bottom-6 duration-500 fill-mode-both sm:mt-8"
          )}
        >
          <div className="glass-strong rounded-[1.75rem] p-6 shadow-glass sm:p-10">
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={emojiAssets.mainSrc}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 object-contain"
                  decoding="async"
                  loading="lazy"
                  aria-hidden
                />
                <span>{emojiAssets.formTitleLabel} · 입력</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {CATEGORY_DESC[selectedCategory]}
              </p>
            </div>

            <div className="pt-8">
              <CategoryFormShell
                isAnalyzing={isAnalyzing}
                onAnalyze={handleAnalyze}
                myeongunOptIn={myeongunOptIn}
                onMyeongunOptInChange={setMyeongunOptIn}
                expectedCredits={expectedCredits}
              >
                <CategoryPanelForm
                  categoryId={selectedCategory}
                  forms={forms}
                  onFormsChange={setForms}
                  disabled={isAnalyzing}
                />
              </CategoryFormShell>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}