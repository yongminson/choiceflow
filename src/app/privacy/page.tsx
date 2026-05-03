import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 sm:py-32">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="size-4" />
        홈으로 돌아가기
      </Link>
      
      <header className="mb-12 border-b border-border/40 pb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">개인정보처리방침</h1>
        <p className="mt-4 text-muted-foreground">시행일: 2026년 4월 26일</p>
      </header>

      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none space-y-10 leading-relaxed text-foreground/80">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">1. 수집하는 개인정보의 항목 및 수집 방법</h2>
          <p>와이엠 스튜디오(이하 "회사")는 회원가입 및 원활한 서비스 제공을 위해 아래와 같은 개인정보를 수집하고 있습니다.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>필수 항목:</strong> 이메일 주소, 소셜 로그인 식별자, 비밀번호(자체 가입 시)</li>
            <li><strong>수집 방법:</strong> 홈페이지 회원가입 및 소셜 로그인 연동 시 수집</li>
            <li><strong>결제 정보:</strong> 본 서비스는 전면 무료로 운영되므로, <strong>어떠한 결제/금융 정보도 수집하지 않습니다.</strong></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>회원 식별 및 가입 의사 확인</li>
            <li>서비스 제공에 관한 계약 이행 및 분석 결과 제공</li>
            <li>고지사항 전달, 불만 처리 등 고객 편의 제공</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">3. 개인정보의 보유 및 이용 기간</h2>
          <p>회사는 원칙적으로 회원이 탈퇴하거나 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</p>
        </section>
      </div>
    </div>
  );
}