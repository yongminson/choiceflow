import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

type Props = {
  params: { keyword: string };
};

// 🔥 1. 구글/네이버 로봇이 긁어갈 메타데이터(제목, 설명) 자동 생성기
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const decodedKeyword = decodeURIComponent(params.keyword).replace(/-/g, " ");
  return {
    title: `${decodedKeyword} 추천 및 비교 분석 | ChoiceFlow`,
    description: `${decodedKeyword} 뭘 고를지 고민되시나요? 10만 건의 데이터를 학습한 ChoiceFlow AI가 장단점부터 가성비까지 1분 만에 완벽하게 분석해 드립니다. 지금 무료로 확인하세요.`,
  };
}

// 🔥 2. 유저가 보게 될 맞춤형 방문 페이지
export default function KeywordLandingPage({ params }: Props) {
  // 주소창의 '30대-남자-선물'을 '30대 남자 선물'로 예쁘게 띄어쓰기로 바꿈
  const decodedKeyword = decodeURIComponent(params.keyword).replace(/-/g, " ");

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      {/* 배경 장식 */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_60%_at_50%_20%,oklch(0.62_0.12_252/0.14),transparent_55%)]" aria-hidden />

      <div className="w-full max-w-3xl text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-8" />
        </div>
        
        {/* SEO 핵심: H1 태그 (검색엔진이 제일 중요하게 보는 제목) */}
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          <span className="text-primary">{decodedKeyword}</span><br />
          어떤 걸 선택할지 고민이신가요?
        </h1>
        
        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          인터넷 검색하며 광고 글만 보느라 지치셨죠? <br className="hidden sm:block" />
          이제 10만 건 이상의 빅데이터를 학습한 <strong>ChoiceFlow AI</strong>에게 맡겨주세요.
        </p>

        <div className="mx-auto mb-12 grid max-w-xl gap-4 text-left sm:grid-cols-2">
          {[
            "광고 없는 객관적인 장단점 비교",
            "내 예산과 상황에 딱 맞는 맞춤 추천",
            "숨겨진 가성비 대안(Option C) 발굴",
            "전문가 관점의 핵심 인사이트 제공",
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-white/50 px-4 py-3 shadow-sm dark:bg-white/5">
              <CheckCircle2 className="size-5 text-emerald-500" />
              <span className="text-sm font-medium text-foreground/80">{feature}</span>
            </div>
          ))}
        </div>

        {/* 유저를 메인 분석 화면으로 꽂아버리는 버튼 */}
        <Link 
          href="/" 
          className="inline-flex h-14 items-center justify-center rounded-full bg-primary px-8 text-lg font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          무료로 AI 분석 시작하기
          <ArrowRight className="ml-2 size-5" />
        </Link>
      </div>
    </div>
  );
}