import type { Metadata } from "next";

import { ResultDashboardView } from "@/components/result/result-dashboard-view";

export const metadata: Metadata = {
  title: "분석 결과",
  description:
    "0.1% 전문가 관점의 결정적 통찰(Killer Insight)과 A/B 비교, 한 줄 요약 리포트입니다.",
};

export default function ResultPage() {
  return <ResultDashboardView />;
}
