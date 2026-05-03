import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 sm:py-32">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="size-4" />
        홈으로 돌아가기
      </Link>
      
      <header className="mb-12 border-b border-border/40 pb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">환불 정책</h1>
        <p className="mt-4 text-muted-foreground">본 서비스는 100% 무료로 제공됩니다.</p>
      </header>

      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none space-y-10 leading-relaxed text-foreground/80">
        <section>
          <p>
            ChoiceFlow(와이엠 스튜디오)의 모든 AI 분석 서비스 및 부가 기능은 현재 <strong>전면 무료</strong>로 제공되고 있습니다. 
            따라서 유료 결제에 따른 취소 및 환불 규정이 적용되지 않습니다.
          </p>
          <p className="mt-4">
            서비스 이용 중 문의 사항이 있으신 경우, 고객센터(admin@choiceflow.com)로 연락해 주시기 바랍니다.
          </p>
        </section>
      </div>
    </div>
  );
}