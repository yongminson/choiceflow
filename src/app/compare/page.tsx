import type { Metadata } from "next";

import { CompareView } from "@/components/compare/compare-view";

export const metadata: Metadata = {
  title: "둘 중에 뭘 사지?",
  description:
    "고민 중인 두 가지를 넣으면 무엇을 골라야 하는지, 왜 그런지, 나중에 후회하기 쉬운 지점까지 정리해 드립니다.",
};

export default function ComparePage() {
  return <CompareView />;
}
