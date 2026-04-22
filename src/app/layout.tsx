import "./globals.css";

import type { Metadata } from "next";
import { Noto_Sans_KR, Plus_Jakarta_Sans } from "next/font/google";
import { AppFooter } from "@/components/layout/app-footer";
import { AppNavbarWrapper } from "@/components/layout/app-navbar-wrapper";
import { MeshBackground } from "@/components/layout/mesh-background";
import { CreditsRefreshProvider } from "@/components/auth/credits-refresh-context";
import { BillingProvider } from "@/components/payment/billing-provider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

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
  description:
    "망설임의 시간을 확신으로. AI 기반 선택 분석 서비스 ChoiceFlow.",
  
  // 🔥 [핵심 추가] 네이버와 구글의 검색엔진 소유권 확인 태그를 여기에 세팅합니다.
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
      </body>
    </html>
  );
}