"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { PushButton } from "@/components/push-button";

export function AppNavbar() {
  const pathname = usePathname();
  const isEditorialPage = pathname === "/" || pathname === "/result";

  return (
    <header
      className={cn(
        "relative z-50 w-full transition-all",
        isEditorialPage
          ? "pointer-events-none border-transparent bg-transparent px-3 pt-3"
          : "border-b border-border bg-background",
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3 sm:gap-4 sm:px-6",
          isEditorialPage &&
            "pointer-events-auto h-12 max-w-5xl rounded-full border border-black/10 bg-white/85 px-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-5",
        )}
      >
        <button
          type="button"
          className={cn(
            "flex shrink-0 cursor-pointer items-center gap-2 font-display text-[17px] font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90 sm:text-lg",
            isEditorialPage && "text-[15px] sm:text-base",
          )}
          aria-label="ChoiceFlow 첫 화면으로 이동"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          {/* 👇 여기에 로고 이미지가 들어갑니다 */}
          <Image
            src="/logo.png"
            width={28}
            height={28}
            alt="ChoiceFlow 로고"
            className={cn("h-7 w-7 object-contain", isEditorialPage && "h-6 w-6")}
          />
          <span>ChoiceFlow</span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          
          <PushButton variant="icon" />

          {/* 나중에 사용할 수 있으므로 마이페이지(로그인) 버튼 주석 처리
          <Link
            href={userHref}
            prefetch={user !== null}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "relative z-[9999] rounded-full bg-white/25 backdrop-blur-md touch-manipulation"
            )}
          >
            <div className="flex items-center justify-center">
              <UserRound className="h-5 w-5 text-foreground/80" />
            </div>
          </Link>
          */}
        </div>
      </div>
    </header>
  );
}
