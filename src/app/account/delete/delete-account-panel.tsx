"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";

import { useSupabaseUser } from "@/components/auth/use-supabase-user";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase";

/**
 * 계정 삭제 실행 패널.
 *
 * Google Play는 로그인하지 않은 심사자도 삭제 절차를 볼 수 있어야 한다고 요구한다.
 * 그래서 안내 문서는 서버 컴포넌트에 두고, 실제 실행 버튼만 여기서 상태에 따라 바꾼다.
 */
export function DeleteAccountPanel() {
  const user = useSupabaseUser();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const canDelete = confirmText.trim() === "계정 삭제" && !isDeleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "계정 삭제에 실패했습니다.");
      }

      // 서버에서 계정이 사라졌으므로 남아 있는 쿠키 세션도 정리한다.
      try {
        await createBrowserSupabaseClient().auth.signOut();
      } catch {
        // 이미 계정이 없어 signOut 이 실패해도 삭제 자체는 끝난 상태다.
      }
      setDone(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-[15px] font-black">계정이 삭제되었습니다.</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          아래 「보관되는 정보」 항목을 제외한 모든 계정 데이터가 삭제되었습니다.
          이용해 주셔서 감사합니다.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-[14px] font-bold transition hover:border-foreground/40"
        >
          홈으로
        </Link>
      </div>
    );
  }

  // 로그인 상태를 확인하는 중
  if (user === undefined) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="flex items-center gap-2 text-[14px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          로그인 상태를 확인하고 있습니다.
        </p>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-[15px] font-black">먼저 로그인해 주세요</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          본인 확인을 위해 삭제하려는 계정으로 로그인해야 합니다. 로그인 후 이
          페이지로 자동으로 돌아옵니다.
        </p>
        <Link
          href="/login?next=/account/delete"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-[14px] font-bold text-primary-foreground transition hover:opacity-90"
        >
          로그인하고 계속하기
        </Link>
        <p className="mt-5 border-t border-border pt-4 text-[13px] leading-relaxed text-muted-foreground">
          로그인할 수 없는 경우, 가입에 사용한 이메일 주소로{" "}
          <a
            href="mailto:support@ymstudio.co.kr?subject=%EA%B3%84%EC%A0%95%20%EC%82%AD%EC%A0%9C%20%EC%9A%94%EC%B2%AD"
            className="font-bold text-primary underline underline-offset-4"
          >
            support@ymstudio.co.kr
          </a>
          로 삭제를 요청해 주세요. 영업일 기준 3일 이내에 처리합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-6">
      <p className="flex items-center gap-2 text-[15px] font-black text-destructive">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        이 작업은 되돌릴 수 없습니다
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">{user.email}</strong> 계정과 관련
        데이터가 삭제됩니다. 삭제 후에는 같은 계정으로 다시 로그인할 수 없고,
        분석 기록도 복구되지 않습니다.
      </p>

      <label
        htmlFor="delete-confirm"
        className="mt-5 block text-[13px] font-bold"
      >
        확인을 위해 <span className="text-destructive">계정 삭제</span>라고
        입력해 주세요
      </label>
      <input
        id="delete-confirm"
        type="text"
        value={confirmText}
        disabled={isDeleting}
        autoComplete="off"
        onChange={(event) => setConfirmText(event.target.value)}
        placeholder="계정 삭제"
        className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] outline-none transition focus:border-destructive focus:ring-2 focus:ring-destructive/20 disabled:opacity-50"
      />

      <Button
        type="button"
        variant="destructive"
        className="mt-4 min-h-12 w-full rounded-xl"
        disabled={!canDelete}
        onClick={() => void handleDelete()}
      >
        {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
        계정 영구 삭제
      </Button>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-destructive/10 p-3 text-[13px] font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
