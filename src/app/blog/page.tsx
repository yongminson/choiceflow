import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CATEGORY_LABEL, getAllPosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "구매 판단 가이드",
  description:
    "무엇을 사라가 아니라, 무엇을 기준으로 판단할지 정리한 글 모음입니다. 카테고리별로 비교 기준과 확인 방법을 다룹니다.",
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 py-16 sm:px-8 sm:py-24">
      <header className="border-b border-border pb-8">
        <h1 className="text-[30px] font-black tracking-[-0.03em] sm:text-[38px]">
          구매 판단 가이드
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          &ldquo;이걸 사세요&rdquo;가 아니라 &ldquo;무엇을 기준으로 고를지&rdquo;를
          정리했습니다. 읽고 나면 상세페이지를 직접 비교할 수 있게 쓰는 것이
          목표입니다.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="mt-10 text-[15px] text-muted-foreground">
          아직 올라온 글이 없습니다.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-border">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-2 py-6 transition-opacity hover:opacity-80"
              >
                <span className="flex items-center gap-2 text-[12px] font-bold text-primary">
                  {CATEGORY_LABEL[post.categoryId]}
                  <span className="font-medium text-muted-foreground">
                    {post.publishedAt}
                  </span>
                </span>
                <span className="text-[20px] font-black leading-snug tracking-tight sm:text-[22px]">
                  {post.title}
                </span>
                <span className="text-[14px] leading-relaxed text-muted-foreground">
                  {post.description}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-primary">
                  읽기
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-12 rounded-2xl border border-primary/20 bg-primary-soft p-6 text-center sm:p-8">
        <h2 className="text-[20px] font-black tracking-tight">
          읽어도 결정이 안 되면
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
          조건 몇 개만 고르면 후보를 비교해 하나를 골라드립니다. 가입도, 로그인도
          필요 없습니다.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-7 text-[15px] font-black text-primary-foreground transition hover:opacity-90"
        >
          추천받아 보기
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </section>
    </div>
  );
}
