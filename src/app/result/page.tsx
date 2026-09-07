import type { Metadata } from "next";

import { ResultDashboardView } from "@/components/result/result-dashboard-view";
import { getAllPosts } from "@/lib/blog/posts";
import { toGuideLinks } from "@/lib/blog/guide-link";

export const metadata: Metadata = {
  title: "분석 결과",
  description:
    "0.1% 전문가 관점의 결정적 통찰(Killer Insight)과 A/B 비교, 한 줄 요약 리포트입니다.",
};

export default async function ResultPage() {
  /*
    결과는 브라우저에 저장된 값으로 그리므로 어떤 분야인지는 서버가 모른다.
    글 목록만 미리 넘겨 두고, 화면이 결과를 읽은 뒤 분야에 맞는 것을 고른다.
  */
  const guidePosts = toGuideLinks(await getAllPosts());

  return <ResultDashboardView guidePosts={guidePosts} />;
}
