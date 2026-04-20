"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

// 🔥 [새로 추가된 부분] 포트원 V2 브라우저 SDK 임포트
import * as PortOne from "@portone/browser-sdk/v2";

import { useSupabaseUser } from "@/components/auth/use-supabase-user";
import { Button } from "@/components/ui/button";
import {
  CREDIT_PACKS,
  type CreditPackId,
  formatWon,
} from "@/lib/payment/credit-packs";
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
      "🎉 오픈 기념 특가 4,900원",
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPack =
    CREDIT_PACKS.find((p) => p.id === selectedPackId) ?? CREDIT_PACKS[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // 🔥 [핵심 변경] 결제 버튼 눌렀을 때 실행되는 함수!
  const handlePay = useCallback(async () => {
    if (tab === "plan") {
      toast.info("구독 플랜은 준비 중입니다.");
      return;
    }

    if (user === undefined) {
      toast.error("로그인 정보를 확인하는 중입니다.");
      return;
    }
    if (!user) {
      toast.error("로그인 후 크레딧을 충전할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 베르첼 변수 인식 오류 방지를 위해 공개 키 직접 하드코딩 (안전함!)
      const storeId = "store-dfe94d23-cfea-4a4d-a36a-0b1864b0903d";
      const channelKey = "channel-key-ef19ec49-725c-43df-82ce-fc73870de2f1";

      if (!storeId || !channelKey) {
        toast.error("결제 시스템 설정 오류입니다. (관리자 문의)");
        setIsSubmitting(false);
        return;
      }

      // 2. 겹치지 않는 고유한 주문번호 생성
      const paymentId = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // 3. 🚀 포트원 결제창 호출! (에러 없애기 위해 타입 우회)
      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        orderName: `ChoiceFlow 크레딧 ${selectedPack.credits}개`,
        totalAmount: selectedPack.priceWon,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
      } as any);

      // 4. 결제 취소, 실패 등 에러 발생 시
      if (response?.code != null) {
        toast.error(response.message || "결제가 취소되었거나 실패했습니다.");
        setIsSubmitting(false);
        return;
      }

      // 5. 💰 결제 성공! 서버에 "진짜 결제됐는지 확인해줘!" 라고 요청
      toast.info("결제 검증 및 크레딧 지급 중...");
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: paymentId,
          packId: selectedPackId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.error || "결제 검증에 실패했습니다.");
        return;
      }

      // 6. 모든 검증 성공 후 크레딧 지급 완료
      const added = data.addedCredits ?? selectedPack.credits;
      toast.success(`🎉 크레딧 ${added}개가 성공적으로 충전되었습니다!`);
      onOpenChange(false);
      window.location.reload();
      
    } catch (e) {
      console.error(e);
      toast.error("결제 처리 중 예상치 못한 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [tab, user, selectedPackId, selectedPack.credits, selectedPack.priceWon, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        aria-label="모달 닫기"
        onClick={() => onOpenChange(false)}
      />

      <div
        className={cn(
          "glass-strong relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-white/15 shadow-glass dark:border-white/10",
          "bg-gradient-to-b from-background/95 via-background/90 to-[oklch(0.14_0.04_260)]/95 dark:from-card/95 dark:via-card/90 dark:to-[oklch(0.12_0.045_258)]/98"
        )}
      >
        <div className="shrink-0 p-6 sm:p-8 sm:pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                <Sparkles className="size-3.5" aria-hidden />
                ChoiceFlow Billing
              </p>
              <h2
                id="billing-modal-title"
                className="font-display mt-2 text-2xl font-semibold tracking-tight text-foreground"
              >
                크레딧이 부족해요
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                분석 1회당 크레딧이 사용됩니다. 플랜 또는 크레딧을 선택해 주세요.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 rounded-full"
              onClick={() => onOpenChange(false)}
              aria-label="닫기"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div
            className="mt-8 flex gap-1 rounded-2xl border border-white/15 bg-black/20 p-1 dark:bg-black/35"
            role="tablist"
            aria-label="결제 유형"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "plan"}
              onClick={() => setTab("plan")}
              className={cn(
                "flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all",
                tab === "plan"
                  ? "bg-white/90 text-foreground shadow-glass-sm dark:bg-white/15 dark:text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              계획 (구독)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "credit"}
              onClick={() => setTab("credit")}
              className={cn(
                "flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all",
                tab === "credit"
                  ? "bg-white/90 text-foreground shadow-glass-sm dark:bg-white/15 dark:text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              크레딧 (단건)
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 sm:px-8">
          {tab === "credit" ? (
            <div className="pb-4">
              <p className="text-[13px] font-medium text-muted-foreground">
                충전할 크레딧 팩을 선택하세요
              </p>
              <div
                className="mt-3 grid gap-3"
                role="radiogroup"
                aria-label="크레딧 팩"
              >
                {CREDIT_PACKS.map((pack) => {
                  const selected = selectedPackId === pack.id;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSelectedPackId(pack.id)}
                      className={cn(
                        "relative flex w-full flex-col rounded-2xl border px-4 py-4 text-left transition-all",
                        "bg-gradient-to-br from-white/[0.06] to-black/20",
                        "hover:border-primary/35 hover:shadow-[0_0_24px_-8px_rgba(99,102,241,0.45)]",
                        selected
                          ? "border-primary/60 ring-2 ring-primary/30 shadow-[0_0_28px_-10px_rgba(99,102,241,0.55)]"
                          : "border-white/12"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-display text-[17px] font-semibold text-foreground">
                            {pack.title}
                          </span>
                          {pack.subtitle ? (
                            <span className="ms-2 text-[12px] font-medium text-emerald-500 dark:text-emerald-400">
                              {pack.subtitle}
                            </span>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-white/25 bg-transparent"
                          )}
                          aria-hidden
                        >
                          {selected ? (
                            <Check className="size-3 stroke-[3]" />
                          ) : null}
                        </span>
                      </div>
                      <p className="mt-2 font-display text-xl font-bold tabular-nums text-foreground">
                        {formatWon(pack.priceWon)}
                        <span className="text-sm font-medium text-muted-foreground">
                          원
                        </span>
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 pb-4 sm:grid-cols-2">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className={cn(
                    "glass flex flex-col rounded-2xl border p-5 text-left transition-all",
                    "hover:border-primary/40 hover:shadow-glass-sm",
                    plan.highlight &&
                      "border-primary/35 bg-gradient-to-b from-primary/12 to-black/25 ring-1 ring-primary/25 dark:from-primary/18 dark:to-black/40",
                    !plan.highlight &&
                      "border-white/12 bg-black/10 dark:bg-black/20"
                  )}
                >
                  <span
                    className={cn(
                      "mb-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      plan.highlight
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/80 text-muted-foreground"
                    )}
                  >
                    {plan.badge}
                  </span>
                  <span className="font-display text-lg font-semibold text-foreground">
                    {plan.name}
                  </span>
                  <span className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
                    {plan.price}
                    <span className="text-base font-medium text-muted-foreground">
                      {plan.unit}
                    </span>
                  </span>
                  <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    {plan.features.map((line) => (
                      <li key={line} className="flex gap-1.5">
                        <Check className="mt-0.5 size-3 shrink-0 text-primary/80" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <Check className="size-3.5" />
                    PortOne 연동 준비중
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-background/40 px-6 py-5 backdrop-blur-sm dark:bg-black/25 sm:px-8">
          {tab === "credit" ? (
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                총 결제 금액
              </span>
              <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                {formatWon(selectedPack.priceWon)}
                <span className="text-base font-semibold text-muted-foreground">
                  원
                </span>
              </span>
            </div>
          ) : (
            <p className="mb-4 text-center text-[12px] text-muted-foreground">
              구독 플랜은 추후 오픈됩니다.
            </p>
          )}
          <Button
            type="button"
            className="h-12 w-full rounded-2xl text-[15px] font-semibold"
            disabled={isSubmitting}
            onClick={() => void handlePay()}
          >
            {isSubmitting ? "처리 중…" : "결제하기"}
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            테스트 환경의 토스/카카오페이 결제창이 뜹니다. 실제 돈은 빠져나가지 않습니다!
          </p>
        </div>
      </div>
    </div>
  );
}