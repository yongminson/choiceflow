import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { DeleteAccountPanel } from "./delete-account-panel";

export const metadata: Metadata = {
  title: "계정 및 데이터 삭제 | ChoiceFlow",
  description:
    "ChoiceFlow 계정과 수집된 데이터를 삭제하는 방법, 삭제되는 항목과 보관되는 항목을 안내합니다.",
};

/**
 * 계정 삭제 안내 페이지.
 *
 * Google Play 데이터 보안 양식의 "계정 삭제 URL"로 제출하는 주소다.
 * 심사자는 로그인하지 않은 상태로 방문하므로, 절차·삭제 항목·보관 항목이
 * 로그인 없이도 전부 읽혀야 한다.
 */
export default function DeleteAccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        홈으로 돌아가기
      </Link>

      <header className="mb-10 border-b border-border/40 pb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          계정 및 데이터 삭제
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          ChoiceFlow(개발자: 와이엠 스튜디오) 계정과 저장된 데이터를 삭제하는
          방법을 안내합니다.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold">삭제 요청 방법</h2>
        <ol className="space-y-3">
          {[
            "이 페이지 아래의 「계정 영구 삭제」 영역에서 삭제할 계정으로 로그인합니다.",
            "확인란에 「계정 삭제」를 입력합니다.",
            "「계정 영구 삭제」 버튼을 누르면 즉시 삭제가 완료됩니다.",
          ].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[12px] font-black text-background">
                {index + 1}
              </span>
              <span className="text-[15px] leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-xl border border-border bg-card p-4 text-[14px] leading-relaxed text-muted-foreground">
          로그인할 수 없는 경우, 가입에 사용한 이메일 주소로{" "}
          <a
            href="mailto:support@ymstudio.co.kr?subject=%EA%B3%84%EC%A0%95%20%EC%82%AD%EC%A0%9C%20%EC%9A%94%EC%B2%AD"
            className="font-bold text-primary underline underline-offset-4"
          >
            support@ymstudio.co.kr
          </a>
          로 삭제를 요청해 주세요. 본인 확인 후 영업일 기준 3일 이내에
          처리합니다.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold">삭제되는 데이터</h2>
        <p className="mb-4 text-[15px] leading-relaxed text-muted-foreground">
          아래 항목은 삭제 요청 시 즉시 파기되며 복구할 수 없습니다.
        </p>
        <ul className="space-y-2.5">
          {[
            ["계정 정보", "이메일 주소, 소셜 로그인 식별자, 사용자 ID"],
            ["프로필", "크레딧 잔액, 가입일, 이용 기록"],
            ["분석 기록", "저장된 추천·비교 결과 전체"],
            ["푸시 알림", "알림 수신을 위해 등록한 기기 구독 정보"],
            ["접속 기록", "페이지 이동 기록에 연결된 사용자 식별자"],
          ].map(([label, detail]) => (
            <li
              key={label}
              className="flex flex-col gap-0.5 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:gap-4"
            >
              <span className="shrink-0 text-[14px] font-bold sm:w-28">
                {label}
              </span>
              <span className="text-[14px] leading-relaxed text-muted-foreground">
                {detail}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold">보관되는 데이터와 기간</h2>
        <p className="mb-4 text-[15px] leading-relaxed text-muted-foreground">
          아래 항목은 삭제 후에도 명시된 기간 동안 보관합니다.
        </p>
        <ul className="space-y-2.5">
          {[
            [
              "탈퇴 이메일 주소",
              "재가입 반복을 통한 무료 크레딧 부정 사용을 막기 위해 보관합니다. 보관 기간 30일, 이후 자동 파기됩니다.",
            ],
            [
              "상담 신청 내역",
              "상담을 신청하신 경우에 한해 성함·연락처를 보관합니다. 전자상거래법에 따른 소비자 불만 및 분쟁 처리 기록으로 3년간 보관 후 파기합니다.",
            ],
            [
              "식별자가 제거된 통계",
              "어떤 메뉴가 많이 쓰였는지에 대한 집계 수치만 남으며, 개인을 식별할 수 있는 정보는 포함되지 않습니다.",
            ],
          ].map(([label, detail]) => (
            <li
              key={label}
              className="flex flex-col gap-0.5 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:gap-4"
            >
              <span className="shrink-0 text-[14px] font-bold sm:w-28">
                {label}
              </span>
              <span className="text-[14px] leading-relaxed text-muted-foreground">
                {detail}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
          위치 좌표는 주변 음식점을 검색하는 요청 처리에만 사용하며 ChoiceFlow
          데이터베이스에 저장하지 않습니다. 따라서 삭제 대상에도 포함되지
          않습니다. 자세한 내용은{" "}
          <Link
            href="/privacy"
            className="font-bold text-primary underline underline-offset-4"
          >
            개인정보처리방침
          </Link>
          을 참고해 주세요.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">계정 영구 삭제</h2>
        <DeleteAccountPanel />
      </section>
    </div>
  );
}
