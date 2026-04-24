"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Supabase 클라이언트 연결
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // pathname이 없거나, 관리자 페이지에 본인이 접속한 건 기록하지 않음
    if (!pathname || pathname.startsWith("/admin")) return;

    const logVisit = async () => {
      try {
        // 로그인한 유저라면 ID도 같이 수집 (누가 어느 메뉴를 눌렀는지 확인용)
        const { data: { user } } = await supabase.auth.getUser();
        
        // Supabase에 접속/메뉴 클릭 기록 쏘기
        await supabase.from("visitor_logs").insert({
          action_type: "PAGE_VIEW",
          path: pathname, // 예: /analyze, /mypage 등 메뉴 경로가 찍힙니다.
          user_id: user?.id || null,
        });
      } catch (e) {
        console.error("추적 에러 숨김 처리");
      }
    };

    logVisit();
  }, [pathname]); // 주소(메뉴)가 바뀔 때마다 실행됨

  return null; // 화면에 보이는 디자인은 없으므로 null 반환
}