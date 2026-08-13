import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const EFFECTIVE_DATE = "2026년 8월 10일";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 sm:py-32">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="size-4" />
        홈으로 돌아가기
      </Link>

      <header className="mb-12 border-b border-border/40 pb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">개인정보처리방침</h1>
        <p className="mt-4 text-muted-foreground">시행일: {EFFECTIVE_DATE}</p>
      </header>

      <div className="prose prose-sm prose-slate max-w-none space-y-10 leading-relaxed text-foreground/80 dark:prose-invert">
        <section>
          <p>
            와이엠 스튜디오(이하 “회사”)는 ChoiceFlow 웹사이트, Android 앱 및 앱인토스 미니앱(이하 “서비스”)을 운영하며,
            개인정보 보호법 등 관계 법령을 준수하고 이용자의 개인정보를 안전하게 처리하기 위해 다음과 같이 개인정보처리방침을 공개합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">1. 처리하는 개인정보</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>회원 및 로그인:</strong> 이메일 주소, 소셜 로그인 제공자가 발급한 식별자, 서비스 내부 사용자 식별자, 로그인 기록</li>
            <li><strong>추천 및 비교:</strong> 사용자가 선택하거나 직접 입력한 조건, 예산, 선호 항목, 비교 대상, 추천 요청 및 결과</li>
            <li><strong>이미지 비교:</strong> 사용자가 분석을 위해 직접 업로드한 이미지</li>
            <li><strong>주변 음식점 추천:</strong> 사용자가 위치 권한을 허용한 경우 현재 위치의 위도·경도와 정확도</li>
            <li><strong>결제:</strong> 주문·결제 식별자, 상품명, 결제 금액, 결제 상태, 크레딧 지급 내역. 카드번호 등 결제수단 정보는 결제대행사가 처리하며 회사 서버에 직접 저장하지 않습니다.</li>
            <li><strong>상담 신청:</strong> 이름, 전화번호, 상담 분야 및 이용자가 입력한 상담 내용</li>
            <li><strong>알림:</strong> 이용자가 알림을 허용한 경우 푸시 구독 주소와 암호화 키</li>
            <li><strong>자동 생성 정보:</strong> 접속 시각, 이용 화면 경로, 쿠키 또는 유사 식별자, 브라우저·기기 및 오류 정보. IP 주소 등은 호스팅·보안·분석 서비스에서 처리될 수 있습니다.</li>
          </ul>
          <p className="mt-3">회원가입 없이 빠른 추천을 이용할 수 있으며, 위치 권한을 거부해도 위치 기반 기능을 제외한 추천을 이용할 수 있습니다.</p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">2. 처리 목적</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>회원 식별, 로그인 유지, 계정 및 이용 내역 관리</li>
            <li>선택 조건 분석, 상품·음식점 후보 검색 및 추천 결과 제공</li>
            <li>결제 확인, 크레딧 지급, 취소·환불 및 고객 문의 처리</li>
            <li>상담 신청 접수와 연락</li>
            <li>푸시 알림 제공, 부정 이용 방지, 장애 분석 및 서비스 개선</li>
            <li>이용 통계 분석과 화면·기능 품질 개선</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">3. 보유 및 이용 기간</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>회원정보와 회원에게 연결된 추천·이용 내역: 회원 탈퇴 시까지</li>
            <li>탈퇴 회원의 이메일 주소: 반복 가입을 통한 부정 이용 방지를 위해 탈퇴 후 30일</li>
            <li>위치 좌표: 주변 검색 요청을 처리하는 동안만 사용하며 ChoiceFlow 데이터베이스에 별도로 저장하지 않음</li>
            <li>브라우저에 저장되는 최근 추천·임시 입력: 이용자가 브라우저 데이터를 삭제할 때까지</li>
            <li>상담 신청 정보: 상담 종료 후 3년 또는 이용자의 삭제 요청 시까지</li>
            <li>결제 및 계약·청약철회 기록: 관련 법령에서 정한 기간</li>
            <li>접속·보안 기록: 관련 법령 또는 보안 목적에 필요한 기간</li>
          </ul>
          <p className="mt-3">법령상 보존 의무가 있는 경우 해당 기간 동안 분리 보관한 후 파기합니다.</p>
          <p className="mt-3">
            회원은 <Link href="/account/delete" className="font-semibold text-primary underline underline-offset-4">계정 및 데이터 삭제</Link> 페이지에서
            언제든 직접 계정과 관련 데이터의 삭제를 요청할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">4. 외부 서비스 이용 및 국외 처리 가능성</h2>
          <p>서비스 제공 과정에서 아래 사업자의 시스템으로 필요한 정보가 전달되거나 처리될 수 있습니다.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><strong>Supabase:</strong> 회원 인증, 데이터베이스 및 서비스 기록 저장</li>
            <li><strong>Vercel:</strong> 웹·서버 호스팅, 접속 및 성능 분석</li>
            <li><strong>Google:</strong> Google Analytics, 주변 장소·날씨 검색, Gemini 기반 추천 처리</li>
            <li><strong>OpenAI:</strong> 설정된 경우 추천 요청의 보조 AI 처리</li>
            <li><strong>PortOne 및 결제대행사:</strong> 결제창 제공과 결제 결과 확인</li>
            <li><strong>Telegram:</strong> 상담 신청이 접수된 경우 담당자 알림</li>
            <li><strong>쿠팡 파트너스:</strong> 상품 검색·제휴 링크 생성 및 제휴 성과 측정</li>
          </ul>
          <p className="mt-3">
            AI 추천을 위해 사용자가 입력한 조건과 업로드 이미지가 선택된 AI 제공자에게 전달될 수 있고, 주변 추천을 위해 위치 좌표가 Google Maps Platform에 전달될 수 있습니다.
            각 사업자의 서버 위치와 보관 기간은 해당 사업자의 정책 및 회사가 선택한 리전에 따라 달라질 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">5. 위치정보와 기기 권한</h2>
          <p>
            위치 권한은 “내 주변 음식점” 기능을 사용자가 직접 선택한 경우에만 요청합니다. Android 설정, 브라우저 설정 또는 앱인토스 권한 설정에서 언제든 철회할 수 있습니다.
            알림 권한도 선택 사항이며 거부해도 핵심 추천 기능을 이용할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">6. 쿠키·로컬 저장소 및 분석 도구</h2>
          <p>
            로그인 유지, 최근 추천, 임시 입력 저장과 이용 통계를 위해 쿠키·세션 저장소·로컬 저장소 및 Google Analytics, Vercel Analytics, 네이버 애널리틱스를 사용할 수 있습니다.
            이용자는 브라우저 또는 기기 설정에서 이를 삭제하거나 제한할 수 있으나 일부 로그인·기록 기능이 제한될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">7. 제휴 링크 안내</h2>
          <p>
            서비스의 일부 상품 링크는 쿠팡 파트너스 활동의 일환으로 제공됩니다. 이용자가 해당 링크를 통해 상품을 구매하면 회사가 일정 수수료를 받을 수 있으며,
            링크 이동 및 구매 과정에서는 쿠팡의 개인정보처리방침이 적용됩니다.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">8. 이용자의 권리와 행사 방법</h2>
          <p>
            이용자는 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지 및 동의 철회를 요청할 수 있습니다. 로그인한 이용자는 마이페이지의 회원 탈퇴 기능을 이용하거나
            아래 이메일로 요청할 수 있습니다. 회사는 본인 확인 후 관계 법령이 정한 범위에서 처리합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">9. 파기 절차 및 안전성 확보 조치</h2>
          <p>
            보유 기간이 끝난 전자적 개인정보는 복구하기 어려운 방법으로 삭제합니다. 회사는 접근권한 제한, 전송구간 암호화, 비밀키의 서버 환경변수 분리,
            인증·권한 확인, 보안 업데이트와 로그 점검 등 합리적인 보호조치를 적용합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">10. 만 14세 미만 아동</h2>
          <p>서비스는 만 14세 미만 아동을 대상으로 개인정보를 의도적으로 수집하지 않습니다. 관련 사실을 알게 된 경우 아래 연락처로 알려주시기 바랍니다.</p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">11. 개인정보 보호 문의</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>사업자: 와이엠 스튜디오</li>
            <li>담당 부서: 개인정보보호 담당</li>
            <li>이메일: <a href="mailto:support@ymstudio.co.kr">support@ymstudio.co.kr</a></li>
          </ul>
          <p className="mt-3">사업자 주소, 대표자명 및 전화번호는 스토어 제출 전에 실제 사업자 정보와 일치하도록 보완해야 합니다.</p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">12. 방침 변경</h2>
          <p>내용이 변경되는 경우 시행 전에 서비스 공지사항 또는 이 페이지를 통해 안내합니다. 중요한 변경에는 법령이 요구하는 별도 동의 절차를 적용합니다.</p>
        </section>
      </div>
    </div>
  );
}
