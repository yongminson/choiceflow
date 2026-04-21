"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 똑똑한 프론트엔드가 주소창의 샵(#)을 낚아채서 쿠키(로그인 증명서)를 직접 굽습니다.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // 쿠키가 구워진 걸 확인하자마자 메인 화면으로 순간이동!
        router.push("/");
        router.refresh();
      }
    });

    // 만약 이미 처리되었다면 바로 메인으로 이동
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
        router.refresh();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-[360px] space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-8 w-8 animate-spin" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          로그인 완료 처리 중...
        </h1>
        <p className="text-sm text-muted-foreground">
          잠시만 기다려주세요. 메인 화면으로 안전하게 모십니다.
        </p>
      </div>
    </div>
  );
}