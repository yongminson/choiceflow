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
        <p className="mt-4 text-muted-foreground">시행일: 2026년 4월 20일</p>
      </header>

      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none space-y-10 leading-relaxed text-foreground/80">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제1조 (목적)</h2>
          <p>이 약관은 와이엠 스튜디오(이하 "회사")가 제공하는 ChoiceFlow 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무, 책임 사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제2조 (서비스의 내용 및 성격)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회사는 인공지능(AI) 기술을 활용하여 회원이 입력한 데이터를 기반으로 선택을 보조하는 분석 결과를 제공합니다.</li>
            <li><strong>(면책조항)</strong> 서비스가 제공하는 분석 결과, 추천 상품, 장소 등은 참고용 정보일 뿐입니다. 회사는 해당 정보의 정확성, 완전성, 신뢰성을 보증하지 않으며, 회원이 이를 바탕으로 내린 최종 결정 및 그 결과(결제, 방문, 구매 등)에 대해 어떠한 법적 책임도 지지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제3조 (서비스 이용 및 크레딧)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회원이 유상으로 결제한 '크레딧'은 결제일로부터 5년간 유효하며, 미사용 시 이월됩니다.</li>
            <li>가입 축하, 추천인 이벤트, 프로모션 등을 통해 무상으로 지급받은 '무료 크레딧'은 환불 대상이 아니며, 회원 탈퇴 시 모든 크레딧은 즉각 소멸됩니다.</li>
            <li>서비스 내 크레딧 사용 시, 유상 결제한 크레딧과 무상 크레딧이 혼재할 경우 어떤 크레딧이 먼저 차감되는지는 시스템 정책을 따르며, 사용된 무료 크레딧을 이유로 한 유상 크레딧의 환불(현금화)은 불가합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제4조 (회원의 의무)</h2>
          <p>회원은 서비스를 이용할 때 다음 각 호의 행위를 하여서는 안 됩니다.</p>
          <ul className="list-decimal pl-5 space-y-2">
            <li>타인의 정보 도용, 비정상적인 방법으로 크레딧을 취득하거나 서비스를 이용하는 행위</li>
            <li>서비스의 시스템이나 서버에 무리를 주거나 해킹, 악성코드 등을 유포하는 행위</li>
            <li>음란, 폭력, 불법적인 내용의 데이터나 이미지를 입력하여 분석을 요청하는 행위</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">제5조 (저작권 및 제휴 링크)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회사가 제공하는 서비스 및 결과물의 저작권은 회사에 귀속됩니다. 단, 회원이 직접 입력한 텍스트 및 이미지의 저작권은 회원에게 있습니다.</li>
            <li>서비스 결과 화면에 포함된 상품/장소 링크 중 일부는 제휴 마케팅(예: 쿠팡 파트너스 등) 링크일 수 있으며, 회원이 해당 링크를 통해 구매 시 회사가 일정액의 수수료를 제공받을 수 있습니다.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}