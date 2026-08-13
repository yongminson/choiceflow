"use client";

import { useState } from "react";
import { Check, Link2, Loader2 } from "lucide-react";

import type { AnalyzeApiResult } from "@/lib/types/analyze";
import { cn } from "@/lib/utils";

/**
 * 결과를 링크로 만들어 공유한다.
 *
 * 이전에는 홈 주소만 복사돼서, 받은 사람은 결과를 볼 수 없었다.
 * 지금은 결과를 서버에 떠서 /r/<id> 주소를 만들고 그것을 넘긴다.
 */
export function ShareResultButton({
  result,
  className,
}: {
  result: AnalyzeApiResult;
  className?: string;
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [sharedUrl, setSharedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const createLink = async (): Promise<string> => {
    if (sharedUrl) return sharedUrl;
    const response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; path?: string; error?: string }
      | null;
    if (!response.ok || payload?.ok !== true || !payload.path) {
      throw new Error(payload?.error || "공유 링크를 만들지 못했습니다.");
    }
    const url = `${window.location.origin}${payload.path}`;
    setSharedUrl(url);
    return url;
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    setError("");
    try {
      const url = await createLink();

      // 모바일은 기본 공유 시트가 카카오톡까지 바로 열어준다.
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: "ChoiceFlow 추천 결과", url });
          return;
        } catch (reason) {
          // 사용자가 공유 시트를 닫은 것은 오류가 아니다. 복사로 넘어가지 않는다.
          if (reason instanceof DOMException && reason.name === "AbortError") {
            return;
          }
        }
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "공유 링크를 만들지 못했습니다."
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={isSharing}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-[14px] font-bold transition hover:border-foreground/40 disabled:opacity-60 sm:w-auto"
        )}
      >
        {isSharing ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : copied ? (
          <Check className="size-4 text-success" aria-hidden />
        ) : (
          <Link2 className="size-4" aria-hidden />
        )}
        {copied ? "링크를 복사했어요" : "결과 공유하기"}
      </button>

      {sharedUrl && (
        <p className="mt-2 break-all text-[12px] text-muted-foreground">
          {sharedUrl}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
