import { Suspense } from "react";

import { HomeClient } from "@/components/dashboard/home-client";
import { CategoryDashboardSkeleton } from "@/components/dashboard/category-dashboard-skeleton";

export default function Home() {
  return (
    <Suspense fallback={<CategoryDashboardSkeleton />}>
      <HomeClient />
    </Suspense>
  );
}
