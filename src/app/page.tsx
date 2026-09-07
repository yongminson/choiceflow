import type { Metadata } from "next";

import { Suspense } from "react";

import { HomeClient } from "@/components/dashboard/home-client";
import { CategoryDashboardSkeleton } from "@/components/dashboard/category-dashboard-skeleton";
import { GuideLinkList } from "@/components/blog/guide-link-list";
import { getAllPosts } from "@/lib/blog/posts";
import { toGuideLinks } from "@/lib/blog/guide-link";

export const metadata: Metadata = {
  // 같은 내용이 여러 주소로 잡히지 않게 원본 주소를 못박는다.
  alternates: { canonical: "/" },
};

/** 홈에 걸어 두는 글 수. 너무 많으면 홈이 목록 페이지처럼 보인다. */
const HOME_GUIDE_COUNT = 6;

export default async function Home() {
  /*
    홈은 이미 색인된 화면이다. 여기서 글로 이어 주면 검색엔진이 글까지
    도달하는 경로가 생긴다. 지금은 글로 들어가는 링크가 푸터 한 곳뿐이라
    글들이 사실상 고립되어 있었다.

    본문 화면은 클라이언트에서 그리지만 이 부분은 서버에서 그려야
    크롤러가 링크를 그대로 본다.
  */
  const posts = toGuideLinks(await getAllPosts()).slice(0, HOME_GUIDE_COUNT);

  return (
    <>
      <Suspense fallback={<CategoryDashboardSkeleton />}>
        <HomeClient />
      </Suspense>

      <GuideLinkList
        posts={posts}
        title="구매 판단 가이드"
        description="추천을 받기 전에, 무엇을 기준으로 볼지부터 정리해 두면 결과를 읽기 쉬워집니다."
        className="mx-auto max-w-[900px] px-5 pb-16 pt-4 sm:px-8 sm:pb-20"
      />
    </>
  );
}
