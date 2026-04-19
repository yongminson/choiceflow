"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CreditsRefreshContextValue = {
  /** `useProfileCredits`가 다시 fetch하도록 증가시키는 토큰 */
  bump: number;
  /**
   * 충전·차감 직후 헤더 등에 반영. 서버가 돌려준 최신 크레딧이 있으면 전달해 즉시 표시합니다.
   */
  bumpRefresh: (nextCreditsFromServer?: number) => void;
  /** `bumpRefresh(숫자)`로 설정된 값 — 프로필 fetch 직후 해제 */
  creditsOverride: number | null;
  clearCreditsOverride: () => void;
};

const CreditsRefreshContext =
  createContext<CreditsRefreshContextValue | null>(null);

export function CreditsRefreshProvider({ children }: { children: ReactNode }) {
  const [bump, setBump] = useState(0);
  const [creditsOverride, setCreditsOverride] = useState<number | null>(null);
  const clearCreditsOverride = useCallback(() => {
    setCreditsOverride(null);
  }, []);
  const bumpRefresh = useCallback((nextCreditsFromServer?: number) => {
    if (typeof nextCreditsFromServer === "number" && Number.isFinite(nextCreditsFromServer)) {
      setCreditsOverride(Math.max(0, Math.floor(nextCreditsFromServer)));
    }
    setBump((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ bump, bumpRefresh, creditsOverride, clearCreditsOverride }),
    [bump, bumpRefresh, creditsOverride, clearCreditsOverride]
  );

  return (
    <CreditsRefreshContext.Provider value={value}>
      {children}
    </CreditsRefreshContext.Provider>
  );
}

export function useCreditsRefresh(): CreditsRefreshContextValue {
  const ctx = useContext(CreditsRefreshContext);
  if (!ctx) {
    return { bump: 0, bumpRefresh: () => {}, creditsOverride: null, clearCreditsOverride: () => {} };
  }
  return ctx;
}
