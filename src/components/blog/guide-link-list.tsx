import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CATEGORY_LABEL, type GuideLink } from "@/lib/blog/guide-link";
import { cn } from "@/lib/utils";

/**
 * 다른 화면에서 글로 넘어가는 링크 묶음.
 *
 * 글이 sitemap 과 목록 페이지에만 걸려 있으면 검색엔진이 각 글까지
 * 도달하는 경로가 하나뿐이다. 색인되지 않은 페이지 대부분이 "발견됨 -
 * 현재 색인이 생성되지 않음"이었는데, 주소는 알지만 들어오는 링크가 없어
 * 크롤링 순서가 밀린 상태다.
 *
 * 이미 색인된 화면(홈·결과)에서 글로 이어 주면 경로가 하나 더 생긴다.
 * 사람에게도 결과만 보고 나가는 대신 판단 기준을 읽을 자리가 된다.
 *
 * 서버 컴포넌트에서도, 클라이언트 컴포넌트 안에서도 쓰기 때문에
 * 상태 없이 받은 것만 그린다.
 */
export function GuideLinkList({
  posts,
  title,
  description,
  className,
}: {
  posts: GuideLink[];
  title: string;
  description?: string;
  className?: string;
}) {
  if (posts.length === 0) return null;

  return (
    <section className={cn("w-full", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-black tracking-[-0.03em] sm:text-[24px]">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-[13px] font-bold text-primary transition-opacity hover:opacity-80"
        >
          가이드 전체 보기
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex h-full flex-col gap-1.5 rounded-2xl border border-border bg-white/60 p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glass-sm dark:bg-white/[0.06]"
            >
              <span className="text-[12px] font-bold text-primary">
                {CATEGORY_LABEL[post.categoryId]}
              </span>
              <span className="text-[16px] font-black leading-snug tracking-tight">
                {post.title}
              </span>
              <span className="text-[13px] leading-relaxed text-muted-foreground">
                {post.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
