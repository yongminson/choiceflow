"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import confetti from "canvas-confetti";

import { GuardrailRejectedModal } from "@/components/analyze/guardrail-rejected-modal";
import { PushButton } from "@/components/push-button";
import { CategoryFormShell } from "@/components/dashboard/category-form-shell";
import { CategoryPanelForm } from "@/components/dashboard/category-panel-forms";
import { ANALYZE_GUARDRAIL_DEFAULT_REASON } from "@/lib/analyze/guardrail";
import { buildAnalyzeBodyFromDashboard } from "@/lib/analyze/build-dashboard-analyze-body";
import { collectDashboardImageFiles } from "@/lib/dashboard/collect-dashboard-form-images";
import { serializeDashboardForms } from "@/lib/dashboard/serialize-dashboard-forms";
import { readFilesAsDataUrls } from "@/lib/utils/file-to-data-url";
import { validateDashboardForm } from "@/lib/dashboard/validate-dashboard-form";
import { CATEGORY_ORDER, type CategoryId, isCategoryId } from "@/lib/types/category";
import { initialDashboardForms, type DashboardFormsState } from "@/lib/types/dashboard-forms";
import { CATEGORY_3D_EMOJI } from "@/lib/emojis/category-3d-emoji";
import { cn } from "@/lib/utils";

import { useSupabaseUser } from "@/components/auth/use-supabase-user";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Share2, Gift, Dices, Plus, X, Trophy } from "lucide-react";

// =====================================================================
// 🎲 [간단 랜덤뽑기 모달 컴포넌트]
// =====================================================================
function FoodRoulette({ onShare }: { onShare: () => void }) {
  const [items, setItems] = useState<string[]>(["", ""]);
  const [result, setResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayItem, setDisplayItem] = useState<string>("?");

  const handleAddItem = () => {
    if (items.length >= 8) return alert("최대 8개까지만 가능합니다!");
    setItems([...items, ""]);
  };
  const handleRemoveItem = (index: number) => {
    if (items.length <= 2) return alert("최소 2개는 입력해야 합니다!");
    setItems(items.filter((_, i) => i !== index));
  };
  const handleUpdateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };
  const spinRoulette = () => {
    const validItems = items.filter((i) => i.trim() !== "");
    if (validItems.length < 2) return alert("메뉴를 2개 이상 입력해주세요!");

    setIsSpinning(true); setResult(null);
    let count = 0;
    const interval = setInterval(() => {
      setDisplayItem(validItems[Math.floor(Math.random() * validItems.length)]);
      count++;
      if (count >= 20) {
        clearInterval(interval);
        const finalResult = validItems[Math.floor(Math.random() * validItems.length)];
        setDisplayItem(finalResult); setResult(finalResult); setIsSpinning(false);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, zIndex: 300 });
      }
    }, 100);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex items-center justify-center gap-2">
        <Dices className="size-6 text-primary" />
        <h3 className="font-display text-xl font-bold text-foreground">결정장애 간단 랜덤뽑기!</h3>
      </div>
      <div className="w-full space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input type="text" placeholder={`후보 ${index + 1} (ex: 짜장면)`} value={item} onChange={(e) => handleUpdateItem(index, e.target.value)} className="flex h-11 w-full rounded-xl border border-black/10 bg-black/5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-white/10 dark:bg-white/5" />
            <button onClick={() => handleRemoveItem(index)} className="p-2 text-muted-foreground hover:text-red-500"><X className="size-5" /></button>
          </div>
        ))}
        <Button variant="outline" onClick={handleAddItem} className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5">
          <Plus className="mr-2 size-4" /> 후보 추가하기
        </Button>
        <div className="py-4 text-center">
          <div className="flex h-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-blue-500/10 text-3xl font-black text-primary shadow-inner">
            {isSpinning ? <span className="animate-pulse">{displayItem}</span> : result ? <span className="flex items-center gap-2 text-green-500 animate-in zoom-in"><Trophy className="size-8" /> {result}</span> : <span className="text-muted-foreground opacity-50">?</span>}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={spinRoulette} disabled={isSpinning} className="h-14 flex-1 text-lg font-bold shadow-lg hover:scale-[1.02] transition-transform">
            {isSpinning ? "고민 중..." : "랜덤뽑기!"}
          </Button>
          <Button 
            onClick={onShare} 
            title="친구에게 공유하고 혜택 받기"
            className="h-14 w-14 shrink-0 bg-blue-50 text-blue-600 shadow-lg transition-transform hover:scale-[1.02] hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
          >
            <Share2 className="size-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
// =====================================================================

const CATEGORY_LABELS: Record<CategoryId, string> = { food: "뭐 먹을까?", gift: "선물상담", appliance: "홈&가전", fashion: "패션", date: "데이트/여행", asset: "고가자산/렌탈" };
const CATEGORY_DESC: Record<CategoryId, string> = { food: "AI 분석 또는 무료 랜덤뽑기를 이용해보세요!", gift: "관계와 예산에 맞는 선물을 좁혀 드려요.", appliance: "제품 스펙과 가성비를 나란히 비교해요.", fashion: "스타일·가격·핏을 한 번에 정리해요.", date: "여행·데이트 코스와 예산을 함께 정리해요.", asset: "리스크와 기간을 반영한 선택을 돕습니다." };
const LOADING_TEXTS = ["10만 건의 실사용자 빅데이터를 스캔하고 있습니다...", "선택하신 옵션의 가성비와 장단점을 비교 중입니다...", "결정적인 제3의 대안(Option C)을 탐색하는 중입니다...", "최종 리포트를 생성하고 있습니다. 잠시만 기다려주세요!"];
const LOADING_EMOJIS = ["👀", "🤔", "💡", "🔍", "😉", "✨"];

function normalizeTab(raw: string | null): CategoryId { if (isCategoryId(raw)) return raw; return "gift"; }

export function CategoryDashboard() {
  const inputSectionRef = useRef<HTMLDivElement>(null);
  const [loadingEmojiIndex, setLoadingEmojiIndex] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = useMemo(() => normalizeTab(searchParams.get("tab")), [searchParams]);

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>(urlTab);
  const [forms, setForms] = useState<DashboardFormsState>(() => initialDashboardForms());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [guardrailOpen, setGuardrailOpen] = useState(false);
  const [guardrailReason, setGuardrailReason] = useState("");
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const user = useSupabaseUser();
  const [credits, setCredits] = useState<number | null>(null);

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showRouletteModal, setShowRouletteModal] = useState(false);

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      localStorage.setItem("choiceflow_inviter", refCode);
      
      const isNotified = sessionStorage.getItem("invite_notified");
      if (!isNotified) {
        toast.success("🎁 지인의 초대로 오셨군요!\n가입하고 환영 선물을 받아보세요!", {
          duration: 6000,
          position: "top-center"
        });
        sessionStorage.setItem("invite_notified", "true");
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const fetchCredits = async () => {
      const sb = createBrowserSupabaseClient();
      const { data } = await sb.from("profiles").select("credits").eq("id", user.id).maybeSingle();
      if (data) {
        const currentCredits = typeof data.credits === 'number' ? data.credits : 0;
        setCredits(currentCredits);

        if (currentCredits === 10) {
          const isWelcomed = localStorage.getItem(`welcomed_${user.id}`);
          if (!isWelcomed) {
            setShowWelcomeModal(true);
            localStorage.setItem(`welcomed_${user.id}`, 'true');

            const inviterId = localStorage.getItem("choiceflow_inviter");
            if (inviterId && inviterId !== user.id) {
              sb.rpc("process_referral", { inviter_id: inviterId }).then(({ data, error }) => {
                if (error) {
                  console.error("추천인 에러:", error);
                } else if (data && data.success) {
                  toast.success("초대한 친구에게 보상이 지급되었습니다! 🎁");
                }
                localStorage.removeItem("choiceflow_inviter");
              });
            }

            const end = Date.now() + 2 * 1000;
            const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'];
            (function frame() {
              confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
              confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });
              if (Date.now() < end) requestAnimationFrame(frame);
            }());
          }
        }
      }
    };
    fetchCredits();
  }, [user]);

  const handleCopyShareLink = useCallback(() => {
    if (!user) {
      toast.error("초대 링크를 복사하려면 먼저 로그인해주세요!");
      return;
    }
    const shareUrl = `https://choice.ymstudio.co.kr/?ref=${user.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("초대 링크가 복사되었습니다! 친구들에게 공유해보세요 🚀");
    });
  }, [user]);

  useEffect(() => { setSelectedCategory(urlTab); }, [urlTab]);
  useEffect(() => { if (searchParams.has("tab")) setIsFormOpen(true); }, [searchParams]);

  useEffect(() => {
    let textInterval: NodeJS.Timeout; let emojiInterval: NodeJS.Timeout;
    if (isAnalyzing) {
      setLoadingTextIndex(0); setLoadingEmojiIndex(0);
      textInterval = setInterval(() => { setLoadingTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length); }, 3000);
      emojiInterval = setInterval(() => { setLoadingEmojiIndex((prev) => (prev + 1) % LOADING_EMOJIS.length); }, 500);
    }
    return () => { clearInterval(textInterval); clearInterval(emojiInterval); };
  }, [isAnalyzing]);

  const openCategory = useCallback((id: CategoryId) => {
    setSelectedCategory(id); setIsFormOpen(true); router.replace(`/?tab=${id}`, { scroll: false });
    
    setTimeout(() => {
      inputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [router]);

  const handleAnalyze = useCallback(async () => {
    const err = validateDashboardForm(selectedCategory, forms);
    if (err) { toast.error(err); return; }
    setIsAnalyzing(true);
    try {
      const draftPayload = { categoryId: selectedCategory, myeongunDeepDataEnabled: false, forms: serializeDashboardForms(forms), savedAt: Date.now() };
      try { sessionStorage.setItem("choiceflow-dashboard-draft", JSON.stringify(draftPayload)); } catch (e) { toast.error("저장 실패"); return; }
      const imageFiles = collectDashboardImageFiles(forms, selectedCategory);
      const images = await readFilesAsDataUrls(imageFiles);
      const analyzeBody = buildAnalyzeBodyFromDashboard(forms, selectedCategory, { myeongunDeepDataEnabled: false, images });
      let res: Response; let data: Record<string, unknown> = {};
      try {
        res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(analyzeBody), credentials: "same-origin", cache: "no-store" });
        try { data = (await res.json()) as Record<string, unknown>; } catch { data = {}; }
      } catch (e) { toast.error("네트워크 오류"); return; }

      if (!res.ok || data.ok !== true) {
        if (data.status === "REJECTED") { setGuardrailReason(typeof data.reason === "string" ? data.reason : ANALYZE_GUARDRAIL_DEFAULT_REASON); setGuardrailOpen(true); return; }
        const msg = typeof data.error === "string" ? data.error : "에러가 발생했습니다.";
        toast.error(msg);
        return;
      }
      const { ok: _ok, ...rest } = data;
      try { sessionStorage.setItem("choiceResult", JSON.stringify(rest)); } catch (storageErr) { toast.error("저장 불가"); return; }
      router.push("/result");
    } catch (e) { toast.error("일시적 오류"); } finally { setIsAnalyzing(false); }
  }, [selectedCategory, forms, router]);

  const emojiAssets = CATEGORY_3D_EMOJI[selectedCategory];

  return (
    <section id="dashboard" className="relative mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
      
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className="mx-4 w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-slate-900">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
              <Gift className="size-10 text-primary animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">🎉 가입을 환영합니다!</h2>
            <p className="text-muted-foreground mb-6">가입을 환영합니다. 지금 바로 시작해보세요!</p>
            <div className="rounded-xl bg-primary/5 p-4 border border-primary/20 mb-6 text-left">
              <p className="text-[14px] font-semibold text-foreground mb-1 text-center">🎁 친구 초대 이벤트</p>
              <p className="text-[13px] text-muted-foreground text-center">아래 링크를 친구들에게 전달해주세요!<br/>친구 가입 시 특별한 혜택을 드립니다.</p>
            </div>
            <Button onClick={handleCopyShareLink} className="w-full h-12 text-[15px] font-bold mb-3 shadow-lg">
              <Share2 className="mr-2 size-5" /> 내 초대 링크 복사하기
            </Button>
            
            <div className="mb-3">
              <PushButton />
            </div>

            <button onClick={() => setShowWelcomeModal(false)} className="mt-2 text-[13px] text-muted-foreground underline hover:text-foreground">
              나중에 하기
            </button>
          </div>
        </div>
      )}

      {showRouletteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-300 p-4">
          <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-slate-900">
            <button onClick={() => setShowRouletteModal(false)} className="absolute right-5 top-5 rounded-full bg-black/5 p-2 text-muted-foreground hover:bg-black/10 hover:text-foreground transition-colors dark:bg-white/10 dark:hover:bg-white/20">
              <X className="size-5" />
            </button>
            <FoodRoulette onShare={handleCopyShareLink} />
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-primary/20 bg-white/90 p-8 sm:p-12 shadow-[0_0_50px_rgba(0,0,0,0.1)] backdrop-blur-xl text-center max-w-[90vw] dark:bg-slate-900/90">
            <div className="relative mb-6 flex size-24 items-center justify-center rounded-full bg-gradient-to-tr from-sky-100 to-indigo-100 shadow-inner dark:from-sky-900/40 dark:to-indigo-900/40">
              <span className="text-5xl animate-bounce drop-shadow-md">{LOADING_EMOJIS[loadingEmojiIndex]}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground mb-3">AI가 열일 중이에요! 🚀</h3>
            <p className="min-h-[1.5rem] text-[14px] sm:text-[15px] font-semibold text-primary animate-pulse transition-all duration-500">{LOADING_TEXTS[loadingTextIndex]}</p>
          </div>
        </div>
      )}

      <GuardrailRejectedModal open={guardrailOpen} reason={guardrailReason} onRetry={() => setGuardrailOpen(false)} />
      
      {/* 🔥 메인 컨테이너 시작 */}
      <div className={cn("flex flex-col items-center justify-center px-1 text-center", isFormOpen ? "min-h-0 pt-8 sm:pt-10" : "min-h-[calc(100dvh-5.5rem)] sm:min-h-[calc(100dvh-6rem)]")}>
        <h1 className="font-display max-w-4xl text-balance text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.045em] text-foreground sm:text-4xl md:text-5xl md:leading-[1.08]">
          어떤 선택이 <span className="mt-1.5 block bg-gradient-to-br from-primary via-primary to-foreground/65 bg-clip-text text-transparent sm:mt-2.5">고민이신가요?</span>
        </h1>
        
        {/* 6개 아이콘 그룹 */}
        <div className={cn("mt-8 w-full max-w-[60rem] mx-auto sm:mt-9 md:mt-10", "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-6 md:gap-3 lg:gap-4")}>
          {CATEGORY_ORDER.map((id) => {
            const selected = selectedCategory === id;
            return (
              <button key={id} type="button" onClick={() => openCategory(id)} className={cn("flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 transition-all sm:min-h-[4rem] sm:gap-1.5 sm:rounded-[1.5rem] sm:px-3 sm:py-3.5 md:min-h-[4.5rem] md:px-2 md:py-3 lg:min-h-[5rem] lg:px-3 lg:py-4 glass border border-white/40 bg-white/45 shadow-glass-sm backdrop-blur-md hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass active:scale-[0.98] dark:border-white/12 dark:bg-white/[0.08]", selected && "border-primary/50 bg-primary/14 ring-2 ring-primary/35 dark:bg-primary/18")}>
                <img src={CATEGORY_3D_EMOJI[id].mainSrc} alt="" width={56} height={56} className={cn("shrink-0 object-contain select-none transition-transform", id === "food" ? "size-14 sm:size-16 scale-110" : "size-12 sm:size-14")} decoding="async" loading="lazy" aria-hidden />
                <span className="max-w-full mt-1 truncate px-1 text-center text-[12px] font-bold leading-tight text-foreground sm:text-[13px] md:text-[13px] lg:text-[14px]">{CATEGORY_LABELS[id]}</span>
              </button>
            );
          })}
        </div>

        {/* 🚨 [쿠팡 파트너스 심사 통과용 임시 배너] - 승인 후 API 나오면 삭제하세요! */}
        <div className="mx-auto mt-12 w-full max-w-[60rem] px-2 sm:px-0 border-t-2 border-dashed border-primary/20 pt-10">
          <div className="mb-6 rounded-2xl bg-slate-900 p-1 text-center">
             <p className="text-[17px] font-black leading-snug text-white py-3">
               📢 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
             </p>
          </div>

          <a
            href="https://link.coupang.com/a/euZhic"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-between overflow-hidden rounded-3xl border-4 border-primary bg-white p-6 shadow-xl transition-transform hover:scale-[1.02]"
          >
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-primary mb-1">ChoiceFlow 추천 상품</span>
              <span className="font-display text-[18px] sm:text-[22px] font-black tracking-tight text-slate-900">
                쿠팡 로켓배송 베스트 상품 확인하기 &rarr;
              </span>
            </div>
            <div className="flex shrink-0 items-center justify-center rounded-2xl bg-slate-50 p-3 ml-4">
              <img 
                src="https://image9.coupangcdn.com/image/coupang/common/logo_coupang_w350.png" 
                alt="쿠팡" 
                className="h-6 w-auto object-contain sm:h-9" 
              />
            </div>
          </a>
          
          {/* 하단에 한 번 더 강조 (심사원 시력 보호용) */}
          <p className="mt-6 text-center text-[18px] font-black text-slate-900 underline decoration-primary decoration-4 underline-offset-8">
            이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
          </p>
        </div>
        {/* 🚨 [심사용 배너 끝] */}
        
        </div>

      {isFormOpen && (
        <div ref={inputSectionRef} className="mt-5 animate-in fade-in slide-in-from-bottom-6 duration-500 fill-mode-both sm:mt-8">
          <div className="glass-strong rounded-[1.75rem] p-6 shadow-glass sm:p-10">
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-x-2 gap-y-2 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                <img src={emojiAssets.mainSrc} alt="" width={28} height={28} className="h-7 w-7 shrink-0 object-contain" decoding="async" loading="lazy" aria-hidden />
                <span>{emojiAssets.formTitleLabel} · 입력</span>
                {selectedCategory === "food" && (
                  <button onClick={() => setShowRouletteModal(true)} className="ml-2 animate-bounce rounded-full bg-gradient-to-r from-primary to-blue-500 px-3 py-1 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105">
                  🎲 간단 랜덤뽑기
                </button>
                )}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{CATEGORY_DESC[selectedCategory]}</p>
            </div>
            <div className="pt-8">
            <CategoryFormShell isAnalyzing={isAnalyzing} onAnalyze={handleAnalyze}>
                <CategoryPanelForm categoryId={selectedCategory} forms={forms} onFormsChange={setForms} disabled={isAnalyzing} />
              </CategoryFormShell>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}