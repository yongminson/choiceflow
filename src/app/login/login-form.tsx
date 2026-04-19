"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  mapAuthErrorToKorean,
  resolveLoginUrlAlert,
} from "@/lib/auth/auth-error-messages";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type HashAuthParams = {
  error_code: string | null;
  error: string | null;
};

function LoginFormInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next") ?? "/";
  const nextSafe =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  const errorParam = searchParams.get("error");
  const errorCodeParam = searchParams.get("error_code");

  const [hashAuth, setHashAuth] = useState<HashAuthParams | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) return;

    const hp = new URLSearchParams(hash.slice(1));
    setHashAuth({
      error_code: hp.get("error_code"),
      error: hp.get("error"),
    });

    const search = window.location.search;
    window.history.replaceState(
      null,
      "",
      `${pathname}${search}`
    );
  }, [pathname]);

  const urlAlert = useMemo(
    () =>
      resolveLoginUrlAlert({
        errorParam,
        errorCodeParam,
        hashErrorCode: hashAuth?.error_code ?? null,
        hashError: hashAuth?.error ?? null,
      }),
    [errorParam, errorCodeParam, hashAuth]
  );

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextSafe)}`,
          },
        });
        
        if (error) {
          throw error;
        }

        // 🔥 Supabase의 '가짜 성공(Fake Success)' 감지 로직!
        // 이미 가입된 이메일이면 해킹 방지를 위해 에러 대신 identities를 비운 채로 응답합니다.
        if (data?.user?.identities && data.user.identities.length === 0) {
          toast.error("이미 가입된 이메일입니다. '로그인' 탭을 이용해 주세요!");
          setMode("signin"); // 탭을 '로그인'으로 스르륵 바꿔줌
          return;
        }

        if (data.session) {
          toast.success("가입이 완료되었습니다.");
          router.push("/");
          router.refresh();
        } else {
          toast.success(
            "확인 이메일을 보냈습니다. 메일함의 링크를 눌러 가입을 마무리해 주세요."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
             toast.error("이메일이나 비밀번호가 일치하지 않습니다.");
             return;
          }
          throw error;
        }
        
        router.push("/");
        router.refresh();
      }
    } catch (unknownErr) {
      console.error(unknownErr);
      toast.error(mapAuthErrorToKorean(unknownErr));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-10 text-center">
        <p className="font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          ChoiceFlow
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">
          {mode === "signin" ? "로그인" : "계정 만들기"}
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          이메일과 비밀번호로 계속합니다.
        </p>
      </div>

      {urlAlert ? (
        <div
          role="alert"
          className={cn(
            "mb-6 rounded-2xl border px-4 py-3 text-center text-sm leading-relaxed",
            urlAlert.kind === "info"
              ? "border-sky-200/90 bg-sky-50/95 text-sky-950 dark:border-sky-800/80 dark:bg-sky-950/35 dark:text-sky-100"
              : "border-destructive/30 bg-destructive/5 text-destructive dark:border-destructive/40"
          )}
        >
          {urlAlert.message}
        </div>
      ) : null}

      <div className="mb-8 flex rounded-2xl bg-muted/50 p-1 dark:bg-white/[0.06]">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors",
            mode === "signin"
              ? "bg-white text-foreground shadow-sm dark:bg-white/10"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setMode("signin")}
        >
          로그인
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors",
            mode === "signup"
              ? "bg-white text-foreground shadow-sm dark:bg-white/10"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setMode("signup")}
        >
          회원가입
        </button>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded-[1.75rem] border border-white/40 bg-white/[0.65] p-8 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[13px] font-medium">
              이메일
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="h-12 rounded-xl border-white/30 bg-white/80 text-[15px] dark:border-white/15 dark:bg-white/[0.08]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[13px] font-medium">
              비밀번호
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
              className="h-12 rounded-xl border-white/30 bg-white/80 text-[15px] dark:border-white/15 dark:bg-white/[0.08]"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-8 h-12 w-full rounded-full text-[15px] font-semibold shadow-md"
        >
          {loading
            ? "처리 중…"
            : mode === "signin"
              ? "로그인"
              : "회원가입하고 시작하기"}
        </Button>
      </form>

      <p className="mt-8 text-center text-[13px] text-muted-foreground">
        로그인 후 메인 화면에서 AI 분석을 이용할 수 있습니다.
      </p>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] w-full max-w-[400px] items-center justify-center text-sm text-muted-foreground">
          불러오는 중…
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}