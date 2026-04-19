import type { Metadata } from "next";

import { StartPageView } from "@/components/start/start-page-view";

export const metadata: Metadata = {
  title: "시작하기",
};

export default function StartPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <StartPageView />
    </div>
  );
}
