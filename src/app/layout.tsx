import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { VisitorTracker } from "@/components/visitor-tracker";
import { AdminFloatingWidget } from "@/components/admin-floating-widget";
import type { Metadata } from "next";
import { Noto_Sans_KR, Plus_Jakarta_Sans } from "next/font/google";
import { AppFooter } from "@/components/layout/app-footer";
import { AppNavbarWrapper } from "@/components/layout/app-navbar-wrapper";
import { MeshBackground } from "@/components/layout/mesh-background";
import { CreditsRefreshProvider } from "@/components/auth/credits-refresh-context";
import { BillingProvider } from "@/components/payment/billing-provider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn(display.variable, notoSansKr.variable)}>
      <body className="min-h-screen antialiased">
        <VisitorTracker />
        <AdminFloatingWidget />
        <CreditsRefreshProvider>
          <BillingProvider>
            <MeshBackground />
            <AppNavbarWrapper />
            <div className="flex min-h-screen flex-col pt-14">
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