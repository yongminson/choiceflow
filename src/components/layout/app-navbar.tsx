"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";

import { useProfileCredits } from "@/components/auth/use-profile-credits";
import { useSupabaseUser } from "@/components/auth/use-supabase-user";
import { useBilling } from "@/components/payment/billing-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PushButton } from "@/components/push-button";

export function AppNavbar() {
  const pathname = usePathname();
  const user = useSupabaseUser();
  const credits = useProfileCredits(user, pathname);
  
  const userHref =
    user === undefined ? "/mypage" : user === null ? "/login" : "/mypage";

  return (
    <header className="glass-nav fixed top-0 z-50 w-full">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3 sm:gap-4 sm:px-6">
        <button
          type="button"
          className="flex shrink-0 cursor-pointer items-center gap-2 font-display text-[17px] font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90 sm:text-lg"
          aria-label="ChoiceFlow 첫 화면으로 이동"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          {/* 👇 여기에 로고 이미지가 들어갑니다 */}
          <img
            src="/logo.png"
            alt="ChoiceFlow 로고"
            className="h-7 w-7 object-contain"
          />
          <span>ChoiceFlow</span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          
          <PushButton variant="icon" />

          <Link
            href={userHref}
            prefetch={user !== null}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "relative z-[9999] rounded-full bg-white/25 backdrop-blur-md touch-manipulation"
            )}
            aria-label={user === null ? "로그인" : "마이페이지"}
          >
            <UserRound className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}