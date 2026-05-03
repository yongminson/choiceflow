"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import { useSupabaseUser } from "@/components/auth/use-supabase-user";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type AnalysisRow = {
  id: string;
  category: string;
  input_data?: unknown;
  result_data?: unknown;
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
  const [analysisRows, setAnalysisRows] = useState<AnalysisRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadProfileAndHistory = useCallback(async () => {
    if (!user) {
      setAnalysisRows([]);
      return;
    }
    setHistoryLoading(true);
    const sb = createBrowserSupabaseClient();
    
    // 무료화에 맞게 크레딧, 결제내역 호출 부분은 완전히 제거하고 분석 내역만 가져옵니다.
    const { data, error } = await sb
      .from("analysis_history")
      .select("id, category, input_data, result_data, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    
    setHistoryLoading(false);
    setAnalysisRows(error ? [] : (data as AnalysisRow[]));
  }, [user]);

  useEffect(() => {
    void loadProfileAndHistory();
  }, [loadProfileAndHistory]);

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

  // 회원 탈퇴 로직
  const handleDeleteAccount = async () => {
    const isConfirm = window.confirm("정말 탈퇴하시겠습니까? 모든 데이터가 영구적으로 삭제됩니다.");
    if (!isConfirm) return;

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`탈퇴 실패 원인: ${data.error}`); 
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      
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

        <div className="mt-8 rounded-2xl border border-white/25 bg-black/[0.04] p-3 dark:border-white/10 dark:bg-black/25">
          <p className="text-[13px] font-semibold text-foreground px-1">최근 분석 내역</p>
        </div>

        <div className="mt-2 min-h-[200px] rounded-2xl border border-white/30 bg-white/35 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          {historyLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중…</p>
          ) : analysisRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              아직 분석 기록이 없습니다.
            </p>
          ) : (
            <ul className="max-h-[min(360px,50vh)] space-y-3 overflow-y-auto pr-1">
              {analysisRows.map((row) => {
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
                    {summarySnippet ? (
                      <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {summarySnippet}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full rounded-2xl border-white/40 bg-transparent dark:border-white/15"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="me-2 size-4" aria-hidden />
          로그아웃
        </Button>

        <div className="mt-6 text-center">
          <button 
            type="button"
            className="text-[12px] text-muted-foreground/50 hover:text-red-400 hover:underline transition-colors"
            onClick={handleDeleteAccount}
          >
            회원 탈퇴
          </button>
        </div>

      </div>
    </>
  );
}