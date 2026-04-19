import Link from "next/link";
import { ChevronLeft, HelpCircle } from "lucide-react";

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 sm:py-32">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        홈으로 돌아가기
      </Link>
      
      <header className="mb-12 border-b border-border/40 pb-10">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <HelpCircle className="size-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">취소 및 환불정책</h1>
        <p className="mt-4 text-muted-foreground">ChoiceFlow의 유료 결제(크레딧 충전)에 관한 환불 규정입니다.</p>
      </header>

      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none space-y-10 leading-relaxed text-foreground/80">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제1조 (환불의 원칙)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>ChoiceFlow에서 결제하는 '크레딧'은 디지털 재화로서, 결제 후 <strong>사용하지 않은 크레딧에 한하여 결제일로부터 7일 이내</strong>에 전액 환불이 가능합니다.</li>
            <li>AI 분석을 위해 이미 소모(사용)된 크레딧은 서비스가 완전히 제공된 것으로 간주하여 <strong>어떠한 경우에도 환불이 불가</strong>합니다.</li>
            <li>이벤트, 프로모션 등을 통해 회사로부터 무상으로 지급받은 보너스 크레딧은 환불 대상에서 제외됩니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제2조 (부분 환불 불가)</h2>
          <p>결제한 패키지(요금제) 중 일부 크레딧을 사용한 경우, 남은 잔여 크레딧에 대한 부분 환불이나 현금 반환은 지원하지 않습니다. 결제 시 신중하게 구매해 주시기 바랍니다.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제3조 (회사의 귀책사유로 인한 환불)</h2>
          <p>서버 점검, 시스템 장애 등 회사의 명백한 귀책사유로 인해 크레딧이 소모되었으나 분석 결과를 전혀 받지 못한 경우, 회사는 회원의 요청에 따라 소모된 크레딧을 복구(재지급)하거나 해당 결제 건에 대해 환불 처리를 진행합니다.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제4조 (환불 절차)</h2>
          <p>환불을 원하시는 회원은 결제일로부터 7일 이내에 아래 고객센터 이메일을 통해 환불을 접수해야 합니다.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>고객센터 이메일:</strong> support@ymstudio.co.kr</li>
            <li><strong>기재 사항:</strong> 가입 이메일 계정, 결제일, 결제 금액, 환불 사유</li>
            <li>접수된 환불 건은 영업일 기준 3~5일 이내에 최초 결제 수단을 통해 취소 처리됩니다. (카드사 사정에 따라 실제 환급일은 다를 수 있습니다.)</li>
          </ul>
        </section>
      </div>
    </div>
  );
}