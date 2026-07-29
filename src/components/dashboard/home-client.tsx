"use client";

import { useSearchParams } from "next/navigation";

import { CategoryDashboard } from "@/components/dashboard/category-dashboard";
import { QuickRecommendationDashboard } from "@/components/dashboard/quick-recommendation-dashboard";

export function HomeClient() {
  const searchParams = useSearchParams();
  return searchParams.get("details") === "1" ? (
    <CategoryDashboard />
  ) : (
    <QuickRecommendationDashboard />
  );
}
