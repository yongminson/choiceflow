"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Link2, Loader2, Sparkles, CheckCircle2, ThumbsDown, MessageSquare, BarChart3, Gift, Search, MapPin } from "lucide-react";
import { toast } from "sonner";
import { buildDirectCoupangNpSearchUrl } from "@/lib/monetization/coupang-search";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalyzeApiResult } from "@/lib/types/analyze";
import { AnalysisAffiliateSection } from "@/components/result/analysis-affiliate-section";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeChoiceResultPayload(
  v: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...v };
  if (typeof out.killerInsight !== "string") out.killerInsight = "";
  if (out.searchKeyword === undefined) out.searchKeyword = null;
  else if (typeof out.searchKeyword === "string") {
    const t = out.searchKeyword.trim();
    out.searchKeyword = t.length > 0 ? t : null;
  }
  return out;
}

function isAnalyzeApiResult(v: unknown): v is AnalyzeApiResult {
  if (!isRecord(v)) return false;
  if (v.winner !== "A" && v.winner !== "B") return false;
  if (typeof v.winnerName !== "string") return false;
  if (typeof v.score !== "number" || !Number.isFinite(v.score)) return false;
  return true;
}

function MetricBar({ percent, label, icon, isDanger }: { percent: number; label: string; icon: React.ReactNode; isDanger?: boolean }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex w-full flex-1 flex-col space-y-2.5">
      <div className="flex items-end justify-between gap-4">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold tracking-wide text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className={cn("font-display text-2xl font-bold tabular-nums tracking-tight sm:text-3xl", isDanger ? "text-rose-500" : "text-foreground")}>
          {p}
          <span className="text-lg font-semibold text-muted-foreground">%</span>
        </span>
      </div>
      <div className={cn("h-4 w-full overflow-hidden rounded-full shadow-inner", isDanger ? "bg-rose-500/15 dark:bg-rose-500/20" : "bg-white/25 dark:bg-white/10")}>
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-out",
            isDanger ? "bg-gradient-to-r from-rose-400 to-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.4)]" : "bg-gradient-to-r from-primary via-primary to-violet-400/90 shadow-[0_0_20px_oklch(0.55_0.18_252/0.45)]"
          )}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

export function ResultDashboardView() {
  const captureRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<AnalyzeApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("choiceResult");
      if (!raw || !raw.trim()) {
        setError("저장된 분석 결과가 없습니다. 홈에서 다시 분석해 주세요.");
        setHydrated(true);
        return;
      }
      const parsedRaw: unknown = JSON.parse(raw);
      const parsed = isRecord(parsedRaw) ? normalizeChoiceResultPayload(parsedRaw) : parsedRaw;
      if (!isAnalyzeApiResult(parsed)) {
        setError("결과 형식이 올바르지 않거나 이전 버전의 데이터입니다. 다시 분석해 주세요.");
        setHydrated(true);
        return;
      }
      setData(parsed);
    } catch {
      setError("결과를 불러오지 못했습니다. 다시 분석해 주세요.");
    } finally {
      setHydrated(true);
    }
  }, []);

  const prosRows = useMemo(() => {
    if (!data || !data.table) return 0;
    return Math.max(data.table.A?.pros?.length || 0, data.table.B?.pros?.length || 0, 1);
  }, [data]);

  const handleSaveImage = useCallback(async () => {
    const el = captureRef.current;
    if (!el) return;
    setSavingImage(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `choiceflow-result-${Date.now()}.png`;
      a.click();
      toast.success("이미지로 저장했습니다.");
    } catch (e) {
      toast.error("이미지 저장에 실패했습니다.");
    } finally {
      setSavingImage(false);
    }
  }, []);

  const handleCopyLink = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("링크를 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }, []);

  if (!hydrated) {
    return <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-col items-center justify-center"><p className="text-sm text-muted-foreground">결과를 불러오는 중…</p></div>;
  }

  if (error || !data) {
    return (
      <div className="relative flex min-h-[calc(100dvh-3.5rem)] w-full flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 size-10 text-destructive" />
          <p className="font-medium text-foreground">{error}</p>
          <Link href="/" className={cn(buttonVariants({ variant: "default" }), "mt-8 inline-flex min-h-[48px] min-w-[200px] rounded-full")}>홈으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const m = data;
  const winnerIsA = m.winner === "A";
  const showSajuPremium = m.myeongunDeepDataEnabled === true && !!m.sajuSynergy;
  const reviews = m.realReviews || [];
  const isFoodCategory = m.categoryId === "food"; // 🔥 카테고리가 음식인지 확인

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] w-full flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_60%_at_50%_20%,oklch(0.62_0.12_252/0.14),transparent_55%),radial-gradient(ellipse_70%_45%_at_80%_80%,oklch(0.75_0.08_280/0.1),transparent_50%)]" aria-hidden />

      <div ref={captureRef} className="w-full max-w-5xl rounded-[2rem] border border-white/30 bg-white/[0.38] p-6 shadow-glass backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.08] sm:p-10 md:p-12">
        <header className="text-center">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/90">Analysis Result</p>
          <h1 className="font-display text-balance leading-[1.12] tracking-[-0.04em] sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            <span className="inline-block align-middle text-[2.25rem] sm:text-5xl md:text-6xl">🏆</span>{" "}
            <span className="align-middle text-[1.05rem] font-medium text-muted-foreground sm:text-lg md:text-xl">AI의 최종 선택:</span>
            <span className="mt-3 block bg-gradient-to-br from-primary via-sky-500 to-primary bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:mt-4 sm:text-4xl md:text-5xl lg:text-[2.75rem]">
              {m.winnerName}
            </span>
          </h1>
        </header>

        <div className="mx-auto mt-12 flex w-full max-w-3xl flex-col gap-6 sm:flex-row sm:gap-10">
          <MetricBar percent={m.winPercentage ?? m.score} label="AI 모델 예측 승률" icon={<CheckCircle2 className="size-4.5 text-primary" />} />
          <MetricBar percent={m.regretProbability ?? Math.max(0, 100 - m.score)} label="선택 후 후회 확률" icon={<ThumbsDown className="size-4.5 text-rose-500" />} isDanger />
        </div>

        {m.comparisonMetrics && m.comparisonMetrics.length > 0 && (
          <section className="mt-12 overflow-hidden rounded-2xl border border-white/25 bg-white/[0.12] p-6 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
            <div className="mb-8 flex items-center justify-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                <BarChart3 className="size-5" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                AI 심층 분석 스탯 비교
              </h3>
            </div>
            
            <div className="mb-8 flex justify-center gap-8 sm:gap-16 text-[14px] font-bold">
              <div className={cn("flex items-center gap-2", winnerIsA ? "text-rose-500 text-[15px]" : "text-indigo-600 dark:text-indigo-400")}>
                <span className={cn("size-3 rounded-full", winnerIsA ? "bg-rose-500" : "bg-indigo-500")}></span>
                {winnerIsA && "🏆 "} {m.optionALabel || "옵션 A"} {winnerIsA && "(승)"}
              </div>
              <div className={cn("flex items-center gap-2", !winnerIsA ? "text-rose-500 text-[15px]" : "text-sky-600 dark:text-sky-400")}>
                {!winnerIsA && "🏆 "} {m.optionBLabel || "옵션 B"} {!winnerIsA && "(승)"}
                <span className={cn("size-3 rounded-full", !winnerIsA ? "bg-rose-500" : "bg-sky-400")}></span>
              </div>
            </div>

            <div className="space-y-5">
              {m.comparisonMetrics.map((metric, i) => (
                <div key={i} className="relative flex w-full items-center justify-center gap-2">
                  <div className="flex flex-1 justify-end">
                    <div className="flex w-full items-center justify-end gap-2 sm:gap-3">
                      <span className="text-[12px] font-bold tabular-nums text-indigo-500">{metric.a}</span>
                      <div className="flex h-3 w-[60px] min-w-[60px] justify-end overflow-hidden rounded-l-full bg-black/5 shadow-inner dark:bg-white/5 sm:w-[150px]">
                         <div className="h-full rounded-l-full bg-gradient-to-l from-indigo-400 to-indigo-600 transition-all duration-1000" style={{ width: `${metric.a}%` }} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-[80px] shrink-0 break-keep text-center text-[11px] font-bold text-foreground/80 sm:w-[100px] sm:text-[13px]">
                    {metric.label}
                  </div>

                  <div className="flex flex-1 justify-start">
                    <div className="flex w-full items-center justify-start gap-2 sm:gap-3">
                    <div className="h-3 w-[60px] min-w-[60px] overflow-hidden rounded-r-full bg-black/5 shadow-inner dark:bg-white/5 sm:w-[150px]">
                         <div className="h-full rounded-r-full bg-gradient-to-r from-sky-400 to-sky-500 transition-all duration-1000" style={{ width: `${metric.b}%` }} />
                      </div>
                      <span className="text-[12px] font-bold tabular-nums text-sky-500">{metric.b}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14">
          <h2 className="text-center font-display text-lg font-semibold text-foreground sm:text-xl">A vs B 장단점 비교</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/25 bg-white/[0.15] dark:border-white/10 dark:bg-white/[0.04]">
            <table className="w-full min-w-[min(100%,520px)] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/20 bg-white/30 dark:border-white/10 dark:bg-white/[0.06]">
                  <th className="w-[32%] px-4 py-4 text-[12px] font-semibold text-muted-foreground sm:px-6">항목</th>
                  <th className="px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-1">
                      {winnerIsA ? <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">옵션 A · 승</span> : <span className="text-[11px] font-medium text-muted-foreground">옵션 A</span>}
                      <span className="font-display text-[15px] font-semibold text-foreground sm:text-base">{m.optionALabel}</span>
                    </div>
                  </th>
                  <th className="px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-1">
                      {!winnerIsA ? <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">옵션 B · 승</span> : <span className="text-[11px] font-medium text-muted-foreground">옵션 B</span>}
                      <span className="font-display text-[15px] font-semibold text-foreground sm:text-base">{m.optionBLabel}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15 text-[13px] leading-relaxed sm:text-sm">
                {Array.from({ length: prosRows }, (_, i) => (
                  <tr key={`pro-${i}`}>
                    <td className="px-4 py-3.5 font-medium text-slate-600 dark:text-slate-300 sm:px-6">장점 {i + 1}</td>
                    <td className="px-4 py-3.5 text-slate-800 dark:text-white sm:px-6">{m.table?.A?.pros?.[i] ?? "—"}</td>
                    <td className="px-4 py-3.5 text-slate-800 dark:text-white sm:px-6">{m.table?.B?.pros?.[i] ?? "—"}</td>
                  </tr>
                ))}
                <tr className="bg-rose-500/[0.06] dark:bg-rose-500/[0.15]">
                  <td className="px-4 py-3.5 font-bold text-rose-600 dark:text-rose-300 sm:px-6">단점·우려</td>
                  <td className="px-4 py-3.5 align-top text-slate-800 dark:text-white sm:px-6">
                    <ul className="list-inside list-disc space-y-1.5">{m.table?.A?.cons?.map((c, idx) => <li key={`a-con-${idx}`}>{c}</li>)}</ul>
                  </td>
                  <td className="px-4 py-3.5 align-top text-slate-800 dark:text-white sm:px-6">
                    <ul className="list-inside list-disc space-y-1.5">{m.table?.B?.cons?.map((c, idx) => <li key={`b-con-${idx}`}>{c}</li>)}</ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 sm:mt-12">
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/95 p-6 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/15 dark:bg-white/[0.09] sm:p-8">
          <h3 className="text-center font-display text-xl font-bold tracking-[-0.03em] sm:text-2xl">
  <span className="bg-gradient-to-r from-blue-600 via-violet-500 to-blue-600 dark:from-sky-300 dark:via-purple-300 dark:to-sky-300 bg-clip-text text-transparent">
    💡 0.1% 전문가의 결정적 이유
  </span>
</h3>
            <p className="mt-6 whitespace-pre-wrap text-pretty text-[15px] leading-[1.75] text-foreground/95 sm:text-base">{m.killerInsight}</p>
            <div className="mt-8 border-t border-slate-200/90 pt-6 dark:border-white/12">
              <p className="text-center font-display text-[15px] font-bold leading-snug tracking-[-0.02em] text-foreground sm:text-lg">{m.summary}</p>
            </div>
          </div>
        </section>

        {/* 🔥 음식이 아닐 때만 리뷰 상자를 보여줍니다! */}
        {reviews.length > 0 && !isFoodCategory && (
          <section className="mt-8 sm:mt-10">
            <div className="rounded-2xl border border-white/25 bg-white/[0.12] p-6 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
              <div className="mb-6 flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <MessageSquare className="size-5" />
                </div>
                {/* 🔥 음식 카테고리일 때 제목을 "AI 조언"으로 변신! */}
                <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  AI 검색 기반 실사용자 리뷰 요약
                </h3>
              </div>
              <div className="grid gap-3">
                {reviews.map((review, idx) => {
                  const splitIdx = review.indexOf(":");
                  const hasPrefix = splitIdx !== -1 && splitIdx < 15;
                  const prefix = hasPrefix ? review.substring(0, splitIdx + 1) : "";
                  const content = hasPrefix ? review.substring(splitIdx + 1).trim() : review;
                  return (
                    <div key={idx} className="relative overflow-hidden rounded-xl border border-white/20 bg-white/40 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] dark:border-white/10 dark:bg-white/[0.05]">
                      <p className="text-[14.5px] leading-relaxed text-foreground/90">{hasPrefix && <span className="mr-1.5 font-bold text-primary">{prefix}</span>}{content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 1. 메인 승자 추천 섹션 (음식일 때는 네이버 지도, 그 외는 쿠팡) */}
        {isFoodCategory ? (
          <section className="mt-8 sm:mt-10">
            <a
              href={`https://map.naver.com/p/search/${encodeURIComponent(m.searchKeyword || m.winnerName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block rounded-2xl border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-500/10 to-teal-400/5 p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(16,185,129,0.25)] sm:p-8 cursor-pointer group"
            >
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110">
                  <MapPin className="size-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl group-hover:text-emerald-600 transition-colors">
                  🗺️ 내 주변 · 지역 추천 검색
                </h3>
              </div>
              <p className="mb-3 text-xl font-bold text-foreground">&apos;{m.searchKeyword || m.winnerName}&apos; 바로 검색하기 바로 검색하기</p>
              <p className="mb-6 text-[15px] leading-relaxed text-foreground/80">
                선택된 결과를 네이버 지도에서 바로 확인해 보세요!
              </p>
              <div className="mt-4 border-t border-emerald-400/20 pt-5">
                <div className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-[15px] font-bold text-white shadow-md transition-all group-hover:bg-emerald-600 group-hover:shadow-lg">
                  <Search className="size-4.5" />
                  네이버 지도 검색하기
                </div>
              </div>
            </a>
          </section>
        ) : (
          <AnalysisAffiliateSection data={m} />
        )}

        {/* 2. 그 아래에 제3의 대안 (Option C) 띄움 */}
        {m.optionC && m.optionC.name && (
          <section className="mt-8 sm:mt-10">
            <a
              href={m.optionC.searchKeyword ? buildDirectCoupangNpSearchUrl(m.optionC.searchKeyword) : "#"}
              target={m.optionC.searchKeyword ? "_blank" : undefined}
              rel={m.optionC.searchKeyword ? "noopener noreferrer sponsored" : undefined}
              className="relative block rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/10 to-orange-400/5 p-6 shadow-[0_0_30px_rgba(251,191,36,0.15)] backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(251,191,36,0.25)] sm:p-8 cursor-pointer group"
            >
              {/* 🎁 우측 상단 통통 튀는 뱃지 */}
              {m.optionC.searchKeyword && (
                <div className="absolute -top-5 -right-3 animate-bounce z-10 drop-shadow-xl group-hover:scale-110 transition-transform">
                  <span className="text-5xl" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))" }}>
                    🎁
                  </span>
                </div>
              )}

              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-transform group-hover:scale-110">
                  <Gift className="size-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl group-hover:text-amber-600 transition-colors">🎁 AI가 찾아낸 숨겨진 대안 (Option C)</h3>
              </div>
              <p className="mb-3 text-xl font-bold text-foreground">{m.optionC.name}</p>
              <p className="mb-6 text-[15px] leading-relaxed text-foreground/80">{m.optionC.reason}</p>
              
              {m.optionC.searchKeyword && (
                <div className="mt-4 border-t border-amber-400/20 pt-5">
                  <div className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-[15px] font-bold text-white shadow-md transition-all group-hover:bg-amber-600 group-hover:shadow-lg">
                    <Search className="size-4.5" />
                    {/* 🔥 음식 카테고리일 땐 버튼 멘트도 살짝 자연스럽게 변경! */}
                    {isFoodCategory ? "집에서 즐기는 상품/밀키트 확인하기" : "대안 상품 (Option C) 가격 확인하기"}
                  </div>
                </div>
              )}
            </a>
          </section>
        )}

        {showSajuPremium && (
          <div className="mt-10 rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-600/90 via-purple-700/85 to-indigo-900/90 p-6 text-white shadow-[0_20px_60px_-15px_rgba(91,33,182,0.55)] sm:p-8">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-5 shrink-0 opacity-95" aria-hidden />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-100/90">Premium Report</span>
            </div>
            <p className="text-pretty text-[15px] font-medium leading-relaxed sm:text-base">{m.sajuSynergy}</p>
          </div>
        )}

        <div className="mt-10 flex flex-col items-stretch gap-3 border-t border-white/15 pt-10 dark:border-white/10 sm:items-center">
          <div className="flex w-full flex-col flex-wrap items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link href="/" className={cn(buttonVariants({ variant: "default" }), "inline-flex min-h-[52px] min-w-[200px] flex-1 items-center justify-center rounded-full px-8 text-[15px] font-semibold shadow-glass-sm sm:min-w-[240px] sm:flex-none sm:px-10")}>다시 분석하기</Link>
            <Button type="button" variant="outline" size="lg" disabled={savingImage} className="min-h-[52px] flex-1 rounded-full px-6 text-[15px] font-semibold sm:flex-none" onClick={() => void handleSaveImage()}>
              {savingImage ? <Loader2 className="me-2 size-5 animate-spin" aria-hidden /> : null} 📸 결과 이미지로 저장
            </Button>
            <Button type="button" variant="outline" size="lg" className="min-h-[52px] flex-1 rounded-full px-6 text-[15px] font-semibold sm:flex-none" onClick={() => void handleCopyLink()}>
              <Link2 className="me-2 size-4 opacity-80" aria-hidden /> 🔗 링크 복사
            </Button>
          </div>
        </div>
      </div>

      <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-8 text-[13px] text-muted-foreground hover:text-foreground")}>← 홈으로</Link>
    </div>
  );
}