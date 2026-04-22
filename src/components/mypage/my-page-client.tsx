"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, LogOut, Sparkles, X, Key, UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

import { useCreditsRefresh } from "@/components/auth/credits-refresh-context";
import { useSupabaseUser } from "@/components/auth/use-supabase-user";
import { useBilling } from "@/components/payment/billing-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type MypageTab = "analysis" | "payment";

type AnalysisRow = {
  id: string;
  category: string;
  spent_credits: number | null;
  input_data?: unknown;
  result_data?: unknown;
  created_at: string;
};

type CreditRow = {
  id: string;
  amount: number | null;
  price: number | null;
  status: string | null;
  created_at: string;
};

function formatHistoryDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

export function MyPageClient() {
  const router = useRouter();
  const user = useSupabaseUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [tab, setTab] = useState<MypageTab>("analysis");
  const [analysisRows, setAnalysisRows] = useState<AnalysisRow[]>([]);
  const [creditRows, setCreditRows] = useState<CreditRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { openBilling, isOpen: billingOpen } = useBilling();
  const { bump } = useCreditsRefresh();
  const prevBillingOpen = useRef(false);

  // 🔥 비밀번호 변경 및 회원 탈퇴용 State 추가
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const loadProfileAndHistory = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setIsPro(null);
      setAnalysisRows([]);
      setCreditRows([]);
      return;
    }
    setHistoryLoading(true);
    const sb = createBrowserSupabaseClient();
    const [profileRes, analysisRes, creditRes] = await Promise.all([
      sb.from("profiles").select("credits, is_pro").eq("id", user.id).maybeSingle(),
      sb.from("analysis_history").select("id, category, spent_credits, input_data, result_data, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      sb.from("credit_history").select("id, user_id, amount, price, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    ]);
    setHistoryLoading(false);

    if (profileRes.error) {
      setCredits(0);
      setIsPro(false);
    } else {
      setCredits(typeof profileRes.data?.credits === "number" ? profileRes.data.credits : 0);
      setIsPro(profileRes.data?.is_pro === true);
    }
    setAnalysisRows(analysisRes.error ? [] : (analysisRes.data as AnalysisRow[]));
    setCreditRows(creditRes.error ? [] : (creditRes.data as CreditRow[]));
  }, [user, bump]);

  useEffect(() => {
    void loadProfileAndHistory();
  }, [loadProfileAndHistory]);

  useEffect(() => {
    if (prevBillingOpen.current && !billingOpen) void loadProfileAndHistory();
    prevBillingOpen.current = billingOpen;
  }, [billingOpen, loadProfileAndHistory]);

  async function handleSignOut() {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  }

  // 🔥 비밀번호 변경 로직
  async function handleUpdatePassword() {
    if (newPassword.length < 6) {
      toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    setIsSubmittingAuth(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmittingAuth(false);
    
    if (error) {
      toast.error("비밀번호 변경에 실패했습니다. 다시 시도해주세요.");
    } else {
      toast.success("비밀번호가 성공적으로 변경되었습니다.");
      setIsChangingPassword(false);
      setNewPassword("");
    }
  }

  // 🔥 회원 탈퇴 로직
  const handleDeleteAccount = async () => {
    const isConfirm = window.confirm("정말 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.");
    if (!isConfirm) return;

    try {
      // 1. API 서버로 탈퇴 요청을 보냅니다.
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
      });

      // 2. 서버가 보낸 결과를 읽어옵니다.
      const data = await response.json();

      if (!response.ok) {
        // 만약 여기서도 실패한다면, 뭉뚱그린 에러가 아니라 '진짜 원인'을 경고창에 띄웁니다.
        alert(`탈퇴 실패 원인: ${data.error}`); 
        return;
      }

      // 3. 🌟 에러 해결 부분: 클라이언트를 직접 불러와서 로그아웃 시킵니다!
      const supabase = createClient();
      await supabase.auth.signOut();
      
      // 4. 깔끔하게 메인으로 이동
      alert('회원 탈퇴가 완료되었습니다.');
      window.location.href = '/'; 
      
    } catch (error) {
      alert('네트워크 연결 오류가 발생했습니다.');
      console.error(error);
    }
  };

  if (user === undefined) return <p className="mt-8 text-center text-sm text-muted-foreground">불러오는 중…</p>;
  if (!user) return <p className="mt-8 text-center text-sm text-muted-foreground">로그인 정보가 없습니다.</p>;

  return (
    <>
      <div
        className={cn(
          "mt-10 overflow-hidden rounded-3xl border border-white/35 bg-gradient-to-br from-white/[0.72] via-white/55 to-primary/[0.08] p-8 shadow-glass backdrop-blur-xl",
          "dark:border-white/12 dark:from-white/[0.08] dark:via-white/[0.05] dark:to-primary/[0.12]"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              계정
            </p>
            <p className="mt-2 break-all text-[15px] font-medium leading-snug text-foreground">
              {user.email}
            </p>
            <p className="mt-2 text-[13px] font-medium text-foreground">
              구독:{" "}
              <span className={isPro === true ? "text-primary" : "text-muted-foreground"}>
                {isPro === null ? "…" : isPro ? "Pro" : "Free"}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary"
              aria-hidden
            >
              <Sparkles className="size-5" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="메인으로 닫기"
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/40 bg-white/45 p-5 dark:border-white/10 dark:bg-white/[0.06]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <Coins className="size-4 shrink-0 opacity-80" aria-hidden />
            보유 크레딧
          </div>
          <p className="mt-2 font-display text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl">
            {credits === null ? "—" : credits}
            <span className="ms-1.5 text-xl font-semibold text-muted-foreground sm:text-2xl">
              개
            </span>
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            카테고리별로 분석 1회당 사용 크레딧이 다를 수 있습니다.
          </p>
        </div>

        {/* 🔥 비밀번호 변경 및 계정 관리 토글 영역 */}
        <div className="mt-6 rounded-2xl border border-white/30 bg-white/30 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          {isChangingPassword ? (
            <div className="space-y-3 animate-in fade-in zoom-in-95">
              <Input
                type="password"
                placeholder="새로운 비밀번호 (6자 이상)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white/50 dark:bg-black/20"
              />
              <div className="flex gap-2">
                <Button onClick={handleUpdatePassword} disabled={isSubmittingAuth} className="flex-1">
                  {isSubmittingAuth ? <Loader2 className="size-4 animate-spin" /> : "비밀번호 변경 완료"}
                </Button>
                <Button variant="outline" onClick={() => setIsChangingPassword(false)} disabled={isSubmittingAuth} className="flex-1">
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="secondary" onClick={() => setIsChangingPassword(true)} className="flex-1 text-[13px] font-semibold bg-white/60 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20">
                <Key className="mr-2 size-4 opacity-70" /> 비밀번호 변경
              </Button>
              <Button variant="ghost" onClick={handleDeleteAccount} disabled={isSubmittingAuth} className="flex-1 text-[13px] text-destructive hover:bg-destructive/10 hover:text-destructive">
                <UserMinus className="mr-2 size-4 opacity-70" /> 회원 탈퇴
              </Button>
            </div>
          )}
        </div>

        <div
          className="mt-8 flex gap-1 rounded-2xl border border-white/25 bg-black/[0.04] p-1 dark:border-white/10 dark:bg-black/25"
          role="tablist"
          aria-label="내역 유형"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "analysis"}
            onClick={() => setTab("analysis")}
            className={cn(
              "flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all",
              tab === "analysis"
                ? "bg-white/90 text-foreground shadow-sm dark:bg-white/15"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            분석 내역
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "payment"}
            onClick={() => setTab("payment")}
            className={cn(
              "flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all",
              tab === "payment"
                ? "bg-white/90 text-foreground shadow-sm dark:bg-white/15"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            결제 내역
          </button>
        </div>

        <div className="mt-4 min-h-[200px] rounded-2xl border border-white/30 bg-white/35 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          {historyLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중…</p>
          ) : tab === "analysis" ? (
            analysisRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                아직 분석 기록이 없습니다.
              </p>
            ) : (
              <ul className="max-h-[min(360px,50vh)] space-y-3 overflow-y-auto pr-1">
                {analysisRows.map((row) => {
                  const spent =
                    typeof row.spent_credits === "number" ? row.spent_credits : 0;
                  const summarySnippet = (() => {
                    const r = row.result_data;
                    if (!r || typeof r !== "object" || r === null) return null;
                    const s = (r as { summary?: unknown }).summary;
                    if (typeof s !== "string" || !s.trim()) return null;
                    const t = s.trim();
                    return t.length > 120 ? `${t.slice(0, 120)}…` : t;
                  })();
                  return (
                    <li
                      key={row.id}
                      className="rounded-xl border border-white/25 bg-white/40 px-3 py-2.5 text-[13px] dark:border-white/10 dark:bg-white/[0.06]"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-foreground">{row.category}</span>
                        <span className="shrink-0 tabular-nums text-[12px] text-muted-foreground">
                          {formatHistoryDate(row.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        소모 {spent} 크레딧
                      </p>
                      {summarySnippet ? (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                          {summarySnippet}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )
          ) : creditRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              아직 결제·충전 내역이 없습니다.
            </p>
          ) : (
            <ul className="max-h-[min(360px,50vh)] space-y-3 overflow-y-auto pr-1">
              {creditRows.map((row) => {
                const creditAmt = row.amount ?? 0;
                const won = row.price ?? 0;
                return (
                  <li
                    key={row.id}
                    className="rounded-xl border border-white/25 bg-white/40 px-3 py-2.5 text-[13px] dark:border-white/10 dark:bg-white/[0.06]"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-foreground">
                        +{creditAmt} 크레딧
                      </span>
                      <span className="shrink-0 tabular-nums text-[12px] text-muted-foreground">
                        {formatHistoryDate(row.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] font-medium text-foreground">
                      결제 {won.toLocaleString("ko-KR")}원
                      {row.status && row.status !== "success" ? (
                        <span className="ms-1 text-muted-foreground">({row.status})</span>
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Button
          type="button"
          className="mt-6 h-12 w-full rounded-2xl text-[15px] font-semibold shadow-md"
          onClick={() => openBilling()}
        >
          크레딧 충전하기
        </Button>

        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full rounded-2xl border-white/40 bg-transparent dark:border-white/15"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="me-2 size-4" aria-hidden />
          로그아웃
        </Button>
      </div>
    </>
  );
}