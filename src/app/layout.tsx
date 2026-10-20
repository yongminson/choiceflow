import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { VisitorTracker } from "@/components/visitor-tracker";
import { AdminFloatingWidget } from "@/components/admin-floating-widget";
import type { Metadata } from "next";
import { Noto_Sans_KR, Plus_Jakarta_Sans } from "next/font/google";
import { AppFooter } from "@/components/layout/app-footer";
import { AppNavbarWrapper } from "@/components/layout/app-navbar-wrapper";
import { CreditsRefreshProvider } from "@/components/auth/credits-refresh-context";
import { BillingProvider } from "@/components/payment/billing-provider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { PlatformRuntimeMarker } from "@/components/platform-runtime-marker";
import { TossLinkBridge } from "@/components/toss-link-bridge";

// 🔥 [추가됨] Next.js 스크립트 컴포넌트 및 구글 애널리틱스
import Script from 'next/script';
import { GoogleAnalytics } from '@next/third-parties/google';

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  // 이 값이 없으면 공유 링크의 미리보기 이미지 주소가 상대 경로로 나가
  // 카카오톡·트위터에서 썸네일이 뜨지 않는다.
  metadataBase: new URL("https://choice.ymstudio.co.kr"),
  title: {
    default: "ChoiceFlow — 선택장애를 위한 AI",
    template: "%s · ChoiceFlow",
  },
  description: "망설임의 시간을 확신으로. AI 기반 선택 분석 서비스 ChoiceFlow.",
  verification: {
    google: "mTatlpiTN0G1CZ1XKfH_gHsYoV183kAtBlZVBxKp4fg",
    other: {
      "naver-site-verification": ["6167765ea7406f0c55598bb7ec583be33bd8e72c"],
    },
  },
};

// 토스 iframe 안에서는 저장소가 막혀 있을 수 있다. 표시를 먼저 붙이고 저장은 나중에 시도한다.
const PLATFORM_BOOT_SCRIPT = `(function(){var k="choiceflow_platform",ok=function(v){return v==="android"||v==="apps-in-toss"},p=null;try{p=new URLSearchParams(location.search).get("platform")}catch(e){}if(!ok(p)&&/ChoiceFlowAndroid/i.test(navigator.userAgent))p="android";if(!ok(p)){try{p=sessionStorage.getItem(k)}catch(e){}}if(!ok(p))return;document.documentElement.setAttribute("data-choiceflow-platform",p);try{sessionStorage.setItem(k,p)}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
      아래 스크립트가 화면을 읽기 전에 html 에 플랫폼 표시를 붙이므로,
      서버가 보낸 html 과 달라진다는 경고를 끈다.
    */
    <html
      lang="ko"
      className={cn(display.variable, notoSansKr.variable)}
      suppressHydrationWarning
    >
      <head>
        {/*
          토스 미니앱이면 화면을 그리기 전에 표시를 붙인다. React 가 뜬 뒤에
          붙이면 감춰야 할 헤더와 뒤로가기가 잠깐 보였다 사라진다.
          판단 규칙은 lib/platform/runtime.ts 와 같다.
        */}
        <script dangerouslySetInnerHTML={{ __html: PLATFORM_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-[--surface] antialiased">
        <PlatformRuntimeMarker />
        <TossLinkBridge />
        <VisitorTracker />
        <AdminFloatingWidget />
        <CreditsRefreshProvider>
          <BillingProvider>
            <AppNavbarWrapper />
            <div className="flex min-h-screen flex-col">
              <main className="relative flex-1">{children}</main>
              <AppFooter />
            </div>
            <Toaster />
          </BillingProvider>
        </CreditsRefreshProvider>

        {/* 🚀 네이버 애널리틱스 (선택장애 ID 적용) */}
        <Script id="naver-analytics" strategy="afterInteractive">
          {`
            if(!wcs_add) var wcs_add = {};
            wcs_add["wa"] = "1c9a01a88feab40";
            if(window.wcs) {
              wcs_do();
            }
          `}
        </Script>
        <Script src="//wcs.naver.net/wcslog.js" strategy="afterInteractive" />

        {/* 구글 애널리틱스 및 Vercel 분석 */}
        <GoogleAnalytics gaId="G-QC4Z4BX84L" />
        <Analytics />
      </body>
    </html>
  );
}
