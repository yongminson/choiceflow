"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const router = useRouter();

  // ✨ [해결의 핵심] 로그인 토큰이 감지되면 즉시 메인 페이지('/')로 날려버리는 마법의 코드
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // 세션(합격 목걸이)이 확인되면 바로 메인으로 강제 이동!
      if (session) {
        toast.success("로그인 성공!");
        router.push("/");
        router.refresh(); // 화면 새로고침하여 로그인 상태 반영
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSocialLogin = async (provider: 'kakao' | 'google') => {
    setIsLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // 어설픈 콜백 주소 빼고, 내 로그인 창으로 당당하게 돌아와서 위 useEffect가 처리하게 만듦
          redirectTo: `${window.location.origin}/login`, 
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(`${provider} 로그인 중 오류가 발생했습니다.`);
      console.error(error);
      setIsLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-[360px] space-y-8 text-center">
        {/* 로고 섹션 */}
        <div className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">ChoiceFlow</h1>
          <p className="text-muted-foreground">
            당신의 최선의 선택을 위한 AI 분석,<br />지금 바로 시작해보세요.
          </p>
        </div>

        {/* 소셜 로그인 버튼 세트 */}
        <div className="grid gap-3">
          {/* 카카오 로그인 버튼 */}
          <button
            onClick={() => handleSocialLogin('kakao')}
            disabled={!!isLoading}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] text-[15px] font-semibold text-[#191919] transition-all hover:bg-[#FEE500]/90 disabled:opacity-50"
          >
            {isLoading === 'kakao' ? (
              <span className="animate-pulse">연결 중...</span>
            ) : (
              <>
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e3/KakaoTalk_logo.svg" className="h-5 w-5" alt="카카오" />
                카카오로 1초 만에 시작하기
              </>
            )}
          </button>

          {/* 구글 로그인 버튼 */}
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={!!isLoading}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-input bg-white text-[15px] font-semibold text-foreground transition-all hover:bg-accent disabled:opacity-50 dark:bg-zinc-900"
          >
            {isLoading === 'google' ? (
              <span className="animate-pulse">연결 중...</span>
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" alt="구글" />
                Google 계정으로 계속하기
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          로그인 시 ChoiceFlow의 이용약관 및<br />개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}