"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { isEmbeddedStoreRuntime } from "@/lib/platform/runtime";

/** 앱에서도 반드시 도달할 수 있어야 하는 문서들. */
const LEGAL_LINKS = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/refund", label: "환불정책" },
  // Google Play는 계정 삭제 경로가 눈에 띄게 노출되기를 요구한다.
  { href: "/account/delete", label: "계정 및 데이터 삭제" },
];

export function AppFooter() {
  // 서버 렌더 시점에는 런타임을 알 수 없다. 앱에서 웹용 푸터가 잠깐
  // 보였다 사라지는 깜빡임을 막기 위해 판별 전에는 아무것도 그리지 않는다.
  const [runtime, setRuntime] = useState<"unknown" | "web" | "store">("unknown");

  useEffect(() => {
    setRuntime(isEmbeddedStoreRuntime() ? "store" : "web");
  }, []);

  if (runtime === "unknown") return <div className="mt-auto" />;

  /*
    스토어 앱(Android·앱인토스)에서는 마케팅 문구와 사업자 정보 블록을 걷어낸다.
    앱 화면 안에서 웹사이트 푸터가 통째로 나오면 앱처럼 느껴지지 않는다.

    다만 통째로 없애지는 않는다. 앱에는 이 문서로 가는 다른 경로가 없어서,
    푸터를 지우면 개인정보처리방침과 계정 삭제 페이지에 도달할 방법이 사라진다.
    둘 다 스토어 심사에서 요구하는 항목이다. 그래서 링크 한 줄만 남긴다.
  */
  if (runtime === "store") {
    return (
      <footer className="mt-auto border-t border-border/40 py-6">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="mt-3 px-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          일부 상품 링크는 쿠팡 파트너스 활동의 일환이며, 이에 따른 일정액의
          수수료를 제공받습니다.
        </p>
      </footer>
    );
  }

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

          {/* 2. 서비스 링크 (초깔끔 다이어트!) */}
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
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={
                      link.href === "/privacy"
                        ? "font-semibold text-foreground transition-colors hover:text-primary"
                        : "transition-colors hover:text-foreground"
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. 면책 조항 및 제휴 안내 */}
          <div className="md:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              제휴 및 고지
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              ChoiceFlow는 AI 기반 분석 정보를 제공할 뿐, 최종 선택과 결제에 대한 책임은 사용자 본인에게 있습니다.<br /><br />
              ChoiceFlow는 쿠팡 파트너스 활동을 통해 일정액의 수수료를 제공받을 수 있습니다.
            </p>
          </div>
        </div>


        {/* 하단 사업자 정보 */}
        <div className="mt-12 border-t border-border/40 pt-8 text-[12px] text-muted-foreground leading-relaxed">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-4 gap-y-1">
            <span><strong>상호명</strong> : 와이엠 스튜디오 (YM Studio)</span>
            <span className="hidden sm:inline text-border">|</span>
            <span><strong>대표</strong> : 손용민</span>
            <span className="hidden sm:inline text-border">|</span>
            <span><strong>사업자등록번호</strong> : 510-21-21827</span>
            <span className="hidden sm:inline text-border">|</span>

          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-4 gap-y-1 mt-1">
            <span><strong>고객센터</strong> : 0507-1385-9994</span>
            <span className="hidden sm:inline text-border">|</span>
            <span><strong>이메일</strong> : support@ymstudio.co.kr</span>
            <span className="hidden sm:inline text-border">|</span>
            <span><strong>사업장 소재지</strong> : 충청남도 아산시 둔포면 운교길129번길 14-71</span>
          </div>
          <p className="mt-6 text-center text-[11px]">
            © {new Date().getFullYear()} YM Studio & ChoiceFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
