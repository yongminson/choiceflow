import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">이용약관</h1>
        <p className="mt-4 text-muted-foreground">시행일: 2026년 4월 26일</p>
      </header>

      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none space-y-10 leading-relaxed text-foreground/80">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제1조 (목적)</h2>
          <p>이 약관은 와이엠 스튜디오(이하 "회사")가 제공하는 ChoiceFlow 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무, 책임 사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제2조 (서비스의 제공 및 한계)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회사는 AI 기술을 활용하여 사용자의 결정 장애를 돕기 위한 정보(옵션 비교, 추천 등)를 무료로 제공합니다.</li>
            <li>서비스에서 제공하는 모든 AI 분석 결과 및 추천 내용은 통계적 확률과 알고리즘에 기반한 <strong>'참고용 데이터'</strong>입니다.</li>
            <li><strong>회사는 AI 분석 결과의 정확성, 완전성, 신뢰성, 특정 목적에의 적합성을 보증하지 않습니다.</strong></li>
            <li>회원이 서비스의 추천 결과를 신뢰하여 상품을 구매하거나 특정 행동을 취함으로써 발생하는 모든 결과 및 손해에 대한 최종 책임은 회원 본인에게 있으며, 회사는 이에 대해 어떠한 법적 책임도 지지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제3조 (제휴 마케팅 및 광고)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회사는 서비스 내에 제3자가 제공하는 배너, 링크 등 다양한 형태의 광고를 게재할 수 있습니다.</li>
            <li>서비스에서 추천하는 일부 상품 링크는 <strong>쿠팡 파트너스 등 제휴 마케팅 활동의 일환</strong>으로 제공되며, 회원이 해당 링크를 통해 상품을 구매할 경우 회사는 이에 따른 <strong>일정액의 수수료를 제공받을 수 있습니다.</strong></li>
            <li>회사는 링크된 타 사이트의 상품 품질, 배송, 환불 등 거래와 관련된 어떠한 책임도 지지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제4조 (회원의 의무)</h2>
          <p>회원은 서비스를 이용할 때 다음 각 호의 행위를 하여서는 안 됩니다.</p>
          <ul className="list-decimal pl-5 space-y-2">
            <li>타인의 정보 도용 및 비정상적인 방법으로 서비스를 이용하는 행위</li>
            <li>회사가 제공하는 AI 시스템을 해킹하거나 서버에 무리를 주는 행위</li>
            <li>서비스의 결과물을 상업적으로 무단 재배포하는 행위</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제5조 (책임 제한)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회사는 천재지변, 서버 장애, 통신망 오류 등 불가항력적인 사유로 인해 서비스를 제공할 수 없는 경우, 서비스 제공에 관한 책임이 면제됩니다.</li>
            <li>회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않습니다.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}