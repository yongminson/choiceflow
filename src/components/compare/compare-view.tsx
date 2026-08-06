"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, Scale } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CompareApiResult } from "@/lib/types/compare";

const EXAMPLES = [
  ["아이폰 16", "갤럭시 S25"],
  ["에어프라이어", "전자레인지"],
  ["로봇청소기", "무선청소기"],
  ["아이패드", "노트북"],
];

function trackOutboundClick(name: string, keyword: string, slot: string) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", "affiliate_click", {
    category_id: "compare",
    selection_type: slot,
    item_name: name,
    search_keyword: keyword,
  });
}

export function CompareView() {
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompareApiResult | null>(null);

  const canSubmit = optionA.trim().length > 0 && optionB.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionA: optionA.trim(),
          optionB: optionB.trim(),
          context: context.trim() || undefined,
        }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | (CompareApiResult & { ok?: boolean; error?: string })
        | null;
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || "비교 결과를 불러오지 못했습니다.");
      }
      setResult(payload);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "일시적인 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (result) {
    return (
      <ResultView
        result={result}
        onReset={() => {
          setResult(null);
          setError("");
        }}
      />
    );
  }

  return (
    <main className="mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-xl px-5 pb-16 pt-8">
      <Link
        href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-neutral-900 dark:hover:text-white"
      >
        <ArrowLeft className="size-4" />
        홈으로
      </Link>

      <h1 className="mt-6 text-[26px] font-black leading-tight tracking-[-0.03em] sm:text-[30px]">
        둘 중에 뭘 사야 할까요?
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        고민 중인 두 가지만 적으면, 왜 그걸 골라야 하는지까지 알려드려요.
      </p>

      <div className="mt-7 space-y-3">
        <div>
          <label
            htmlFor="option-a" className="mb-1.5 block text-[13px] font-bold text-muted-foreground"
          >
            첫 번째
          </label>
          <input
            id="option-a"
            value={optionA}
            maxLength={60}
            disabled={isLoading}
            onChange={(e) => setOptionA(e.target.value)}
            placeholder="예: 아이폰 16" className="h-14 w-full rounded-xl border border-border bg-card px-4 text-[16px] font-medium outline-none transition focus:border-neutral-900 disabled:opacity-50  dark:focus:border-white"
          />
        </div>

        <div className="flex items-center justify-center">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-[12px] font-black text-muted-foreground dark:bg-neutral-800">
            VS
          </span>
        </div>

        <div>
          <label
            htmlFor="option-b" className="mb-1.5 block text-[13px] font-bold text-muted-foreground"
          >
            두 번째
          </label>
          <input
            id="option-b"
            value={optionB}
            maxLength={60}
            disabled={isLoading}
            onChange={(e) => setOptionB(e.target.value)}
            placeholder="예: 갤럭시 S25" className="h-14 w-full rounded-xl border border-border bg-card px-4 text-[16px] font-medium outline-none transition focus:border-neutral-900 disabled:opacity-50  dark:focus:border-white"
          />
        </div>
      </div>

      <div className="mt-5">
        <label
          htmlFor="context" className="mb-1.5 block text-[13px] font-bold text-muted-foreground"
        >
          상황 한 줄{" "}
          <span className="font-medium text-muted-foreground">
            (선택 · 적으면 훨씬 정확해져요)
          </span>
        </label>
        <input
          id="context"
          value={context}
          maxLength={150}
          disabled={isLoading}
          onChange={(e) => setContext(e.target.value)}
          placeholder="예: 사진 많이 찍고 3년은 쓸 예정" className="h-13 w-full rounded-xl border border-border bg-card px-4 py-3.5 text-[15px] outline-none transition focus:border-neutral-900 disabled:opacity-50  dark:focus:border-white"
        />
      </div>

      <button
        type="button"
        disabled={!canSubmit || isLoading}
        onClick={() => void handleSubmit()} className="mt-6 flex min-h-[56px] w-full items-center justify-center rounded-xl bg-foreground text-[16px] font-black text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-5 animate-spin" />
            비교하는 중…
          </>
        ) : (
          <>
            <Scale className="mr-2 size-5" />
            결정해 주세요
          </>
        )}
      </button>

      {error && (
        <p
          role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <div className="mt-9 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <p className="text-[13px] font-bold text-muted-foreground">이런 것도 비교해요</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map(([a, b]) => (
            <button
              key={`${a}-${b}`}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setOptionA(a);
                setOptionB(b);
              }} className="rounded-full border border-neutral-300 px-3 py-1.5 text-[13px] font-medium text-neutral-600 transition hover:border-foreground hover:text-foreground disabled:opacity-50 dark:border-neutral-700 dark:text-muted-foreground "
            >
              {a} vs {b}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

function ResultView({
  result,
  onReset,
}: {
  result: CompareApiResult;
  onReset: () => void;
}) {
  const isTie = result.verdict === "tie";
  const winnerName = result.verdict === "B" ? result.optionB : result.optionA;
  const loserName = result.verdict === "B" ? result.optionA : result.optionB;
  const winnerUrl = result.verdict === "B" ? result.sourceUrlB : result.sourceUrlA;
  const loserUrl = result.verdict === "B" ? result.sourceUrlA : result.sourceUrlB;
  const winnerKeyword =
    result.verdict === "B" ? result.searchKeywordB : result.searchKeywordA;
  const loserKeyword =
    result.verdict === "B" ? result.searchKeywordA : result.searchKeywordB;
  const winnerTrap = result.verdict === "B" ? result.trapB : result.trapA;
  const loserTrap = result.verdict === "B" ? result.trapA : result.trapB;

  return (
    <main className="mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-xl px-5 pb-16 pt-8">
      <p className="text-[13px] font-bold text-muted-foreground">
        {result.optionA} vs {result.optionB}
      </p>

      {isTie ? (
        <h1 className="mt-2 text-[26px] font-black leading-tight tracking-[-0.03em]">
          기준에 따라 갈립니다
        </h1>
      ) : (
        <h1 className="mt-2 break-keep text-[30px] font-black leading-tight tracking-[-0.03em]">
          <span className="text-[#ae0000] dark:text-red-400">{winnerName}</span>
          <span className="text-muted-foreground"> 쪽이 낫습니다</span>
        </h1>
      )}

      <p className="mt-3 text-[16px] font-medium leading-relaxed">
        {result.headline}
      </p>

      {result.context && (
        <p className="mt-3 inline-block rounded-lg bg-muted px-3 py-1.5 text-[12px] font-bold text-muted-foreground">
          상황: {result.context}
        </p>
      )}

      <section className="mt-7">
        <h2 className="text-[15px] font-black">이렇게 판단했어요</h2>
        <div className="mt-3 space-y-3">
          {result.reasons.map((reason) => (
            <div
              key={reason.label} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <p className="text-[13px] font-black text-foreground">
                {reason.label}
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-600 dark:text-muted-foreground">
                {reason.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {result.whenOther && (
        <section className="mt-5 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/40">
          <p className="text-[13px] font-black text-amber-900 dark:text-amber-200">
            이럴 땐 {isTie ? "다시 생각해 보세요" : `${loserName} 쪽이 맞아요`}
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-amber-900/80 dark:text-amber-100/80">
            {result.whenOther}
          </p>
        </section>
      )}

      {(winnerTrap || loserTrap) && (
        <section className="mt-5">
          <h2 className="text-[15px] font-black">나중에 후회하기 쉬운 지점</h2>
          <div className="mt-3 space-y-2">
            {winnerTrap && (
              <p className="rounded-xl border border-neutral-200 p-4 text-[14px] leading-relaxed dark:border-neutral-800">
                <strong className="font-black">{winnerName}</strong>
                <span className="mt-1 block text-neutral-600 dark:text-muted-foreground">
                  {winnerTrap}
                </span>
              </p>
            )}
            {loserTrap && (
              <p className="rounded-xl border border-neutral-200 p-4 text-[14px] leading-relaxed dark:border-neutral-800">
                <strong className="font-black">{loserName}</strong>
                <span className="mt-1 block text-neutral-600 dark:text-muted-foreground">
                  {loserTrap}
                </span>
              </p>
            )}
          </div>
        </section>
      )}

      <section className="mt-7 space-y-2">
        <a
          href={winnerUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => trackOutboundClick(winnerName, winnerKeyword, "winner")} className="flex min-h-[56px] w-full items-center justify-center rounded-xl bg-[#ae0000] text-[16px] font-black text-white transition hover:bg-[#8f0000]"
        >
          {winnerName} 쿠팡에서 보기
          <ExternalLink className="ml-2 size-4" />
        </a>
        <a
          href={loserUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => trackOutboundClick(loserName, loserKeyword, "runner_up")} className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-neutral-300 text-[15px] font-bold transition hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-white"
        >
          {loserName}도 보기
          <ExternalLink className="ml-2 size-4" />
        </a>
      </section>

      {result.alternative && (
        <section className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-[13px] font-black text-muted-foreground">
            둘 다 애매하다면
          </p>
          <p className="mt-1.5 text-[17px] font-black">
            {result.alternative.name}
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-600 dark:text-muted-foreground">
            {result.alternative.reason}
          </p>
          <a
            href={result.alternative.sourceUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() =>
              trackOutboundClick(
                result.alternative!.name,
                result.alternative!.searchKeyword,
                "alternative"
              )
            } className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-neutral-300 text-[15px] font-bold transition hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-white"
          >
            이 대안 보기
            <ExternalLink className="ml-2 size-4" />
          </a>
        </section>
      )}

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
        쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
        <br />
        AI 판단은 참고용이며 최종 선택과 책임은 본인에게 있습니다.
      </p>

      <button
        type="button"
        onClick={onReset} className={cn(
          "mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl",
          "border border-neutral-300 text-[15px] font-bold transition hover:border-neutral-900",
          "dark:border-neutral-700 dark:hover:border-white"
        )}
      >
        다른 것 비교하기
      </button>
    </main>
  );
}
