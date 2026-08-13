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

  /**
   * 클립보드 복사.
   *
   * Android WebView(스토어 앱·앱인토스)에는 navigator.clipboard 가 없거나
   * 권한이 막혀 있는 경우가 많다. 그때는 옛 execCommand 경로로 넘어간다.
   * 둘 다 실패하면 주소를 직접 고를 수 있게만 해 준다.
   */
  const copyToClipboard = async (url: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }
    } catch {
      // 아래 대체 경로로 넘어간다.
    }

    try {
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(field);
      return ok;
    } catch {
      return false;
    }
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    setError("");

    let url: string;
    try {
      url = await createLink();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "공유 링크를 만들지 못했습니다."
      );
      setIsSharing(false);
      return;
    }

    // 여기부터는 링크가 이미 만들어진 상태다. 복사나 공유 시트가 실패해도
    // "링크를 만들지 못했다"고 말하면 안 된다. 주소는 화면에 남는다.
    try {
      // 브라우저는 기본 공유 시트가 카카오톡까지 바로 열어준다.
      // WebView 에는 navigator.share 자체가 없어 이 블록을 건너뛴다.
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

      if (await copyToClipboard(url)) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
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

      {/*
        복사가 막힌 WebView 에서도 주소를 쓸 수 있어야 한다.
        입력란에 담아 두면 길게 눌러 직접 복사할 수 있다.
      */}
      {sharedUrl && (
        <div className="mt-2">
          <input
            type="text"
            readOnly
            value={sharedUrl}
            aria-label="공유 링크"
            onFocus={(event) => event.currentTarget.select()}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-muted-foreground outline-none focus:border-primary"
          />
          {!copied && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              복사가 안 되면 위 주소를 길게 눌러 직접 복사해 주세요.
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
