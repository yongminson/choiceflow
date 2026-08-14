import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, ChevronLeft } from "lucide-react";

import { CATEGORY_LABEL, getAllPosts, getPostBySlug } from "@/lib/blog/posts";

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: "글을 찾을 수 없습니다" };

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <article className="mx-auto w-full max-w-[760px] px-5 py-16 sm:px-8 sm:py-24">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        가이드 목록
      </Link>

      <header className="mt-6 border-b border-border pb-8">
        <p className="text-[12px] font-bold text-primary">
          {CATEGORY_LABEL[post.categoryId]}
          <span className="ml-2 font-medium text-muted-foreground">
            {post.publishedAt}
          </span>
        </p>
        <h1 className="mt-2 break-keep text-[28px] font-black leading-[1.25] tracking-[-0.03em] sm:text-[36px]">
          {post.title}
        </h1>
      </header>

      <p className="mt-8 whitespace-pre-line text-[16px] leading-[1.85]">
        {post.intro}
      </p>

      <section className="mt-12">
        <h2 className="text-[22px] font-black tracking-tight">
          무엇을 기준으로 볼까
        </h2>
        <div className="mt-5 space-y-4">
          {post.criteria.map((item, index) => (
            <div
              key={item.name}
              className="rounded-2xl border border-border bg-card p-5 sm:p-6"
            >
              <h3 className="flex items-baseline gap-2.5 text-[17px] font-black tracking-tight">
                <span className="text-[13px] font-black tabular-nums text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item.name}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.8] text-muted-foreground">
                {item.why}
              </p>
              <p className="mt-3 border-t border-border pt-3 text-[15px] leading-[1.8]">
                <span className="font-bold">확인 방법 </span>
                {item.how}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[22px] font-black tracking-tight">자주 하는 실수</h2>
        <ul className="mt-5 space-y-3">
          {post.mistakes.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <AlertTriangle
                className="mt-1 size-4 shrink-0 text-amber-600"
                aria-hidden
              />
              <span className="text-[15px] leading-[1.8]">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-[18px] font-black tracking-tight">
          사기 전 확인할 것
        </h2>
        <ul className="mt-4 space-y-2.5">
          {post.checklist.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden />
              <span className="text-[15px] leading-[1.7]">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-[22px] font-black tracking-tight">자주 묻는 질문</h2>
        <dl className="mt-5 space-y-6">
          {post.faq.map((item) => (
            <div key={item.question}>
              <dt className="text-[16px] font-black leading-snug">
                {item.question}
              </dt>
              <dd className="mt-2 text-[15px] leading-[1.8] text-muted-foreground">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14 rounded-2xl border border-primary/20 bg-primary-soft p-6 text-center sm:p-8">
        <h2 className="text-[20px] font-black tracking-tight">
          기준은 알겠는데 여전히 못 고르겠다면
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
          조건 몇 개만 고르면 후보를 비교해 하나를 지목해 드립니다. 조건을 지켰는지
          항목별로 표시하고, 아쉬운 점도 함께 알려드립니다.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-7 text-[15px] font-black text-primary-foreground transition hover:opacity-90"
        >
          {CATEGORY_LABEL[post.categoryId]} 추천받기
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </section>

      {/*
        AI 로 초안을 만든다는 사실을 숨기지 않는다. 읽는 사람이 판단할 근거가
        되고, 나중에 드러났을 때 잃는 신뢰가 훨씬 크다.
      */}
      <p className="mt-10 border-t border-border pt-6 text-[12px] leading-relaxed text-muted-foreground">
        이 글은 ChoiceFlow(와이엠 스튜디오)가 AI로 초안을 작성한 뒤 형식과 내용을
        검토해 발행합니다. 일반적인 판단 기준을 다루며 특정 제품을 보증하지
        않습니다. 실제 사양과 가격은 구매처에서 다시 확인해 주세요.
      </p>
    </article>
  );
}
