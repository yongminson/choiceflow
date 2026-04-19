import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative px-6 pb-28 pt-20 sm:pb-36 sm:pt-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(700px_420px_at_50%_0%,oklch(0.93_0.04_252/0.5),transparent_65%)]"
      />
      <div className="mx-auto flex max-w-[42rem] flex-col items-center text-center">
        <h1 className="text-balance text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-[3.25rem] sm:leading-[1.06]">
          선택의 순간, AI가 확신을 드립니다
        </h1>
        <p className="mt-8 max-w-[34rem] text-pretty text-[17px] font-normal leading-[1.65] text-muted-foreground sm:text-lg sm:leading-[1.7]">
          데이터, 성향, 그리고 사주까지 분석하여 단 30초 만에 후회 없는 선택을
          제안합니다.
        </p>
        <div className="mt-14">
          <Link
            href="/start"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "group/button inline-flex h-12 min-w-[200px] items-center justify-center rounded-full px-10 text-[15px] font-medium tracking-tight shadow-sm shadow-primary/10"
            )}
          >
            무료로 시작하기
            <ArrowRight
              className="ms-1.5 size-4 opacity-70 transition-transform duration-200 group-hover/button:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
