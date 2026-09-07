import type { Metadata } from "next";

import { Suspense } from "react";

import { HomeClient } from "@/components/dashboard/home-client";
import { CategoryDashboardSkeleton } from "@/components/dashboard/category-dashboard-skeleton";

export const metadata: Metadata = {
  // 같은 내용이 여러 주소로 잡히지 않게 원본 주소를 못박는다.
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <Suspense fallback={<CategoryDashboardSkeleton />}>
      <HomeClient />
    </Suspense>
  );
}
