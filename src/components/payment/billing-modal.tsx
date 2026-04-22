"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import * as PortOne from "@portone/browser-sdk/v2";

import { useSupabaseUser } from "@/components/auth/use-supabase-user";
import { Button } from "@/components/ui/button";
import { CREDIT_PACKS, type CreditPackId, formatWon } from "@/lib/payment/credit-packs";
import { cn } from "@/lib/utils";

type BillingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type BillingTab = "plan" | "credit";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "0",
    unit: "원",
    badge: "시작하기",
    features: ["일 1회 무료 (매일 자정 갱신)"],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "9,900",
    unit: "원/월",
    badge: "프리미엄",
    features: [
      "월 50 크레딧 제공",
      "사주 심층 결합",
      "시뮬레이션 우선권",
    ],
    highlight: true,
  },
] as const;

export function BillingModal({ open, onOpenChange }: BillingModalProps) {
  const user = useSupabaseUser();
  const [tab, setTab] = useState<BillingTab>("plan");
  const [selectedPackId, setSelectedPackId] = useState<CreditPackId>("1");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("pro"); // 🔥 구독 플랜 선택 State 추가
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPack = CREDIT_PACKS.find((p) => p.id === selectedPackId) ?? CREDIT_PACKS[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // 🔥 단건 결제 로직 (크레딧 충전)
  const handleSinglePay = async () => {
    const storeId = "store-dfe94d23-cfea-4a4d-a36a-0b1864b0903d";
    const channelKey = "channel-key-ef19ec49-725c-43df-82ce-fc73870de2f1";

    const paymentId = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const response = await PortOne.requestPayment({
      storeId,
      channelKey,
      paymentId,
      orderName: `ChoiceFlow 크레딧 ${selectedPack.credits}개`,
      totalAmount: selectedPack.priceWon,
      currency: "CURRENCY_KRW",
      payMethod: "CARD",
    } as any);

    if (response?.code != null) throw new Error(response.message || "결제가 취소되었거나 실패했습니다.");

    toast.info("결제 검증 및 크레딧 지급 중...");
    const res = await fetch("/api/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, packId: selectedPackId }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "결제 검증에 실패했습니다.");

    const added = data.addedCredits ?? selectedPack.credits;
    toast.success(`🎉 크레딧 ${added}개가 성공적으로 충전되었습니다!`);
    onOpenChange(false);
    window.location.reload();
  };

  // 🔥 [새로 추가된 로직] 정기 구독(빌링키 발급) 로직
  const handleSubscribe = async () => {
    if (selectedPlanId === "free") {
      toast.info("Free 플랜은 현재 이용 중인 기본 플랜입니다.");
      return;
    }

    const storeId = "store-dfe94d23-cfea-4a4d-a36a-0b1864b0903d";
    // ※ 주의: 나중에 실결제 넘어갈 때 정기결제용 채널키가 별도로 발급될 수 있습니다. 지금은 테스트용 채널키를 그대로 씁니다.
    const channelKey = "channel-key-ef19ec49-725c-43df-82ce-fc73870de2f1"; 

    toast.info("결제 수단(카드)을 등록합니다...");
    
    const issueResponse = await PortOne.requestIssueBillingKey({
      storeId,
      channelKey,
      billingKeyMethod: "CARD",
      issueId: `issue-${Date.now()}`,
      issueName: "ChoiceFlow Pro 정기구독",
    } as any);

    if (issueResponse?.code != null) throw new Error(issueResponse.message || "카드 등록이 취소/실패했습니다.");

    toast.info("카드 등록 성공! 첫 달 결제를 진행합니다...");
    
    // 이 부분은 나중에 서버 api(/api/payment/subscribe)를 만들어서 빌링키를 넘겨줘야 합니다.
    // 오늘은 프론트엔드 연결까지만 테스트하기 위해 임시 성공 처리합니다.
    toast.success("🎉 Pro 플랜 정기구독 카드가 성공적으로 등록되었습니다!");
    onOpenChange(false);
  };

  // 🔥 공통 실행 함수
  const handlePayClick = async () => {
    if (!user) {
      toast.error("로그인 후 이용할 수 있습니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (tab === "credit") {
        await handleSinglePay();
      } else {
        await handleSubscribe();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "처리 중 예상치 못한 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => onOpenChange(false)} />
      <div className={cn("glass-strong relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-white/15 shadow-glass dark:border-white/10", "bg-gradient-to-b from-background/95 via-background/90 to-[oklch(0.14_0.04_260)]/95 dark:from-card/95 dark:via-card/90 dark:to-[oklch(0.12_0.045_258)]/98")}>
        <div className="shrink-0 p-6 sm:p-8 sm:pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary"><Sparkles className="size-3.5" aria-hidden /> ChoiceFlow Billing</p>
              <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight text-foreground">크레딧이 부족해요</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">분석 1회당 크레딧이 사용됩니다. 플랜 또는 크레딧을 선택해 주세요.</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 rounded-full" onClick={() => onOpenChange(false)}><X className="size-4" /></Button>
          </div>
          <div className="mt-8 flex gap-1 rounded-2xl border border-white/15 bg-black/20 p-1 dark:bg-black/35">
            <button type="button" onClick={() => setTab("plan")} className={cn("flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all", tab === "plan" ? "bg-white/90 text-foreground shadow-glass-sm dark:bg-white/15 dark:text-foreground" : "text-muted-foreground hover:text-foreground")}>계획 (구독)</button>
            <button type="button" onClick={() => setTab("credit")} className={cn("flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all", tab === "credit" ? "bg-white/90 text-foreground shadow-glass-sm dark:bg-white/15 dark:text-foreground" : "text-muted-foreground hover:text-foreground")}>크레딧 (단건)</button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 sm:px-8">
          {tab === "credit" ? (
            <div className="pb-4">
              <p className="text-[13px] font-medium text-muted-foreground">충전할 크레딧 팩을 선택하세요</p>
              <div className="mt-3 grid gap-3">
                {CREDIT_PACKS.map((pack) => {
                  const selected = selectedPackId === pack.id;
                  return (
                    <button key={pack.id} type="button" onClick={() => setSelectedPackId(pack.id)} className={cn("relative flex w-full flex-col rounded-2xl border px-4 py-4 text-left transition-all hover:border-primary/35 hover:shadow-[0_0_24px_-8px_rgba(99,102,241,0.45)]", "bg-gradient-to-br from-white/[0.06] to-black/20", selected ? "border-primary/60 ring-2 ring-primary/30 shadow-[0_0_28px_-10px_rgba(99,102,241,0.55)]" : "border-white/12")}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-display text-[17px] font-semibold text-foreground">{pack.title}</span>
                          {pack.subtitle ? <span className="ms-2 text-[12px] font-medium text-emerald-500 dark:text-emerald-400">{pack.subtitle}</span> : null}
                        </div>
                        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", selected ? "border-primary bg-primary text-primary-foreground" : "border-white/25 bg-transparent")}>{selected ? <Check className="size-3 stroke-[3]" /> : null}</span>
                      </div>
                      <p className="mt-2 font-display text-xl font-bold tabular-nums text-foreground">{formatWon(pack.priceWon)}<span className="text-sm font-medium text-muted-foreground"> 원</span></p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 pb-4 sm:grid-cols-2">
              {PLANS.map((plan) => {
                const selected = selectedPlanId === plan.id;
                return (
                  <button key={plan.id} type="button" onClick={() => setSelectedPlanId(plan.id)} className={cn("relative glass flex flex-col rounded-2xl border p-5 text-left transition-all hover:border-primary/40 hover:shadow-glass-sm", selected ? "border-primary/60 ring-2 ring-primary/30 bg-primary/5 dark:bg-primary/10" : (plan.highlight ? "border-primary/35 bg-gradient-to-b from-primary/12 to-black/25 dark:from-primary/18 dark:to-black/40" : "border-white/12 bg-black/10 dark:bg-black/20"))}>
                    <span className={cn("mb-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", plan.highlight ? "bg-primary/20 text-primary" : "bg-muted/80 text-muted-foreground")}>{plan.badge}</span>
                    <span className="font-display text-lg font-semibold text-foreground">{plan.name}</span>
                    <span className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">{plan.price}<span className="text-base font-medium text-muted-foreground"> {plan.unit}</span></span>
                    <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                      {plan.features.map((line) => (
                        <li key={line} className="flex gap-1.5"><Check className="mt-0.5 size-3 shrink-0 text-primary/80" /><span>{line}</span></li>
                      ))}
                    </ul>
                    {/* 선택 체크마크 표시 */}
                    <div className="absolute right-4 top-5">
                      <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", selected ? "border-primary bg-primary text-primary-foreground" : "border-white/25 bg-transparent")}>{selected ? <Check className="size-3 stroke-[3]" /> : null}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-background/40 px-6 py-5 backdrop-blur-sm dark:bg-black/25 sm:px-8">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-muted-foreground">총 결제 금액</span>
            <span className="font-display text-2xl font-bold tabular-nums text-foreground">
              {tab === "credit" ? formatWon(selectedPack.priceWon) : (selectedPlanId === "pro" ? "9,900" : "0")}
              <span className="text-base font-semibold text-muted-foreground"> {tab === "credit" ? "원" : "원/월"}</span>
            </span>
          </div>
          
          <Button type="button" className="h-12 w-full rounded-2xl text-[15px] font-semibold" disabled={isSubmitting} onClick={handlePayClick}>
            {isSubmitting ? "처리 중…" : (tab === "plan" && selectedPlanId === "pro" ? "구독 시작하기" : "결제하기")}
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">테스트 환경의 토스/카카오페이 결제창이 뜹니다. 실제 돈은 빠져나가지 않습니다!</p>
        </div>
      </div>
    </div>
  );
}