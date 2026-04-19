import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardHero() {
  return (
    <section className="relative px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-primary/90">
          ChoiceFlow Intelligence
        </p>
        <h1 className="font-display text-balance text-[2rem] font-semibold leading-[1.12] tracking-[-0.04em] text-foreground sm:text-5xl sm:leading-[1.08]">
          망설임의 시간을
          <span className="mt-1 block bg-gradient-to-br from-primary via-primary to-foreground/70 bg-clip-text text-transparent sm:mt-2">
            확신으로 바꿉니다.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
          카테고리를 고르고 고민을 입력하면, AI가 조건에 맞춰 비교 분석과 추천을
          드립니다.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/start"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "h-12 rounded-full px-8 text-[15px] font-medium shadow-glass-sm"
            )}
          >
            지금 분석하기
            <ArrowRight className="ms-2 size-4 opacity-80" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
