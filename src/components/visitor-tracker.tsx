"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { claimSessionStart, getAttribution, getSessionId } from "@/lib/attribution";

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // pathname이 없거나, 관리자 페이지에 본인이 접속한 건 기록하지 않음
    if (!pathname || pathname.startsWith("/admin")) return;

    const logVisit = async () => {
      try {
        // 쿠키 세션을 공유하는 클라이언트여야 user_id 가 실제로 기록된다.
        const supabase = createBrowserSupabaseClient();
        // 로그인한 유저라면 ID도 같이 수집 (누가 어느 메뉴를 눌렀는지 확인용)
        const { data: { user } } = await supabase.auth.getUser();

        // 세션의 첫 기록에는 유입 출처를 함께 남긴다. 경로만 쌓아서는
        // 방문자가 어디서 왔는지 알 수 없어 유입 증감의 원인을 못 찾는다.
        // details 컬럼이 이미 있어 스키마 변경 없이 담을 수 있다.
        const isSessionStart = claimSessionStart();
        const details = isSessionStart
          ? { session_id: getSessionId(), ...getAttribution() }
          : { session_id: getSessionId() };

        // Supabase에 접속/메뉴 클릭 기록 쏘기
        await supabase.from("visitor_logs").insert({
          action_type: isSessionStart ? "SESSION_START" : "PAGE_VIEW",
          path: pathname, // 예: /analyze, /mypage 등 메뉴 경로가 찍힙니다.
          user_id: user?.id || null,
          details,
        });
      } catch {
        // 추적 실패가 서비스 동작을 막아서는 안 된다
      }
    };

    logVisit();
  }, [pathname]); // 주소(메뉴)가 바뀔 때마다 실행됨

  return null; // 화면에 보이는 디자인은 없으므로 null 반환
}