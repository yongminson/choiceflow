import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
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
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">개인정보처리방침</h1>
        <p className="mt-4 text-muted-foreground font-medium">귀하의 정보를 안전하게 보호하는 것이 ChoiceFlow의 최우선 과제입니다.</p>
      </header>

      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none space-y-10 leading-relaxed text-foreground/80">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">1. 수집하는 개인정보의 항목 및 수집 방법</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>필수 수집 항목:</strong> 이메일 주소, 비밀번호(암호화 처리)</li>
            <li><strong>결제 시 수집 항목:</strong> 결제 수단 정보, 결제 기록 (결제대행사(PG)를 통해 안전하게 처리되며 회사 서버에 금융 정보를 직접 저장하지 않습니다.)</li>
            <li><strong>자동 수집 항목:</strong> IP 주소, 쿠키, 서비스 이용 기록(분석 요청 내역 등)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>회원 가입 의사 확인, 본인 식별, 회원 유지 및 관리</li>
            <li>서비스 제공 (AI 분석 이력 저장 및 크레딧 차감 관리)</li>
            <li>유료 서비스 제공에 따른 요금 결제, 취소, 환불 처리</li>
            <li>신규 서비스 개발, 접속 빈도 파악 및 서비스 이용에 대한 통계</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">3. 개인정보의 보유 및 이용 기간</h2>
          <p>회사는 원칙적으로 회원의 탈퇴 시 개인정보를 지체 없이 파기합니다. 단, 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 아래의 기간 동안 보관합니다.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
            <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
            <li>웹사이트 방문 기록: 3개월 (통신비밀보호법)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">4. 유저 입력 데이터(텍스트/이미지) 처리</h2>
          <p>회원이 분석을 위해 업로드하는 텍스트 및 이미지는 AI 분석 목적으로만 일시적으로 사용 및 처리되며, AI 모델 학습에 임의로 활용되지 않습니다. 단, 회원의 서비스 이용 편의를 위해 '분석 이력(History)' 제공 목적으로 클라우드 서버에 암호화되어 안전하게 저장됩니다.</p>
        </section>
      </div>
    </div>
  );
}