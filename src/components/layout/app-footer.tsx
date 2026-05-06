import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="glass mt-auto border-t border-white/10 py-12 backdrop-blur-2xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          
          {/* 1. 브랜드 소개 */}
          <div className="md:col-span-1">
            <p className="font-display text-lg font-semibold text-foreground">
              ChoiceFlow
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              망설임의 시간을 확신으로.<br />AI 기반 선택 분석 서비스.
            </p>
          </div>

          {/* 2. 서비스 링크 */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              서비스
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  메인 홈
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. 법적 고지 및 약관 */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              고객지원 및 약관
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/terms" className="hover:text-foreground transition-colors">이용약관</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</Link></li>
            </ul>
          </div>

          {/* 4. 면책 조항 (쿠팡 파트너스 포함) */}
          <div className="md:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              법적 고지
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/80">
              ChoiceFlow는 AI 기반 분석 정보를 제공할 뿐, 최종 선택에 대한 책임은 사용자 본인에게 있습니다.<br /><br />
              일부 링크는 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
            </p>
          </div>
        </div>

        {/* 🔥 하단 사업자 정보 (통신판매업 삭제, 초깔끔 다이어트 완료) */}
        <div className="mt-12 border-t border-border/40 pt-8 text-[12px] text-muted-foreground leading-relaxed">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-4 gap-y-2">
            <span><strong>운영</strong> : 와이엠 스튜디오 (YM Studio)</span>
            <span className="hidden sm:inline text-border">|</span>
            <span><strong>대표</strong> : 손용민</span>
            <span className="hidden sm:inline text-border">|</span>
            <span><strong>이메일</strong> : support@ymstudio.co.kr</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground/70">
            Copyright © {new Date().getFullYear()} YM Studio. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}