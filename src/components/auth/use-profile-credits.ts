"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { useCreditsRefresh } from "@/components/auth/credits-refresh-context";
import { createBrowserSupabaseClient } from "@/lib/supabase";

/**
 * 로그인 유저의 `profiles.credits` (없으면 0).
 * `refreshKey`를 라우트 경로 등으로 넘기면 페이지 이동 시 다시 조회합니다.
 * `CreditsRefreshProvider` 안에서 `bumpRefresh()` 호출 시에도 다시 조회합니다.
 */
export function useProfileCredits(
  user: User | null | undefined,
  refreshKey: string = ""
): number | null {
  const [credits, setCredits] = useState<number | null>(null);
  const { bump, creditsOverride, clearCreditsOverride } = useCreditsRefresh();

  useEffect(() => {
    if (user === undefined || user === null) {
      setCredits(null);
      clearCreditsOverride();
      return;
    }

    let cancelled = false;
    const sb = createBrowserSupabaseClient();
    void sb
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[useProfileCredits]", error);
          setCredits(0);
          clearCreditsOverride();
          return;
        }
        setCredits(typeof data?.credits === "number" ? data.credits : 0);
        clearCreditsOverride();
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshKey, bump, clearCreditsOverride]);

  if (user && creditsOverride !== null) {
    return creditsOverride;
  }
  return credits;
}
