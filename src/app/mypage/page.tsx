import type { Metadata } from "next";
import Link from "next/link";

import { MyPageClient } from "@/components/mypage/my-page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "마이페이지",
  description: "계정 정보와 설정입니다.",
};

export default function MyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Account
      </p>
      <h1 className="text-center font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        마이페이지
      </h1>
      <MyPageClient />
      <p className="mt-10 text-center">
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← 메인으로
        </Link>
      </p>
    </div>
  );
}
