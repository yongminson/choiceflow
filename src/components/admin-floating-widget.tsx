"use client";

import { useState, useEffect } from "react";
import { useSupabaseUser } from "@/components/auth/use-supabase-user";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function AdminFloatingWidget() {
  const user = useSupabaseUser();
  const [isVisible, setIsVisible] = useState(true);
  const [stats, setStats] = useState({ today: 0, total: 0, paths: [] as any[] });

  // 🔥 대표님 이메일 확인!
  const ADMIN_EMAIL = "yongmincucu@gmail.com";

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      fetchStats();
      // 10초마다 실시간 새로고침
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. 방문자 수는 기존대로 유지 (사이트 접속자 파악용)
      const { count: totalCount } = await supabase
        .from("visitor_logs")
        .select("*", { count: "exact", head: true });

      const { count: todayCount } = await supabase
        .from("visitor_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // 2. 🔥 탭별 인기 순위를 '실제 분석 돌린 횟수(analysis_history)'로 변경!
      const { data } = await supabase.from("analysis_history").select("category").limit(1000);
      
      const categoryCounts = (data || []).reduce((acc: any, log: any) => {
        // DB에 저장된 한글 이름 (뭐 먹을까, 선물상담 등) 그대로 사용
        let p = log.category || "기타"; 
        acc[p] = (acc[p] || 0) + 1;
        return acc;
      }, {});

      // 많이 분석한 순서대로 정렬해서 6개까지만 보여주기
      const sortedCategories = Object.entries(categoryCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 6);

      setStats({ 
        today: todayCount || 0, 
        total: totalCount || 0, 
        paths: sortedCategories 
      });
    } catch (error) {
      console.error("통계 불러오기 실패");
    }
  };

  if (!user || user.email !== ADMIN_EMAIL || !isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] w-64 rounded-2xl border border-slate-700 bg-[#0f172a] p-5 shadow-2xl font-sans">
      <h3 className="mb-4 text-center text-lg font-bold text-amber-400">
        👑 실시간 운영 현황
      </h3>
      
      <div className="mb-4 space-y-2 border-b border-slate-700 pb-4 text-sm">
        <div className="flex justify-between text-slate-200">
          <span className="font-bold">오늘 방문:</span>
          <span className="font-bold text-amber-400">{stats.today}명</span>
        </div>
        <div className="flex justify-between text-slate-200">
          <span className="font-bold">누적 방문:</span>
          <span className="text-slate-400">{stats.total}명</span>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="mb-3 text-xs font-bold text-slate-400 flex items-center gap-1">
          🔥 탭별 분석 횟수 순위
        </h4>
        <ul className="space-y-2 text-sm">
          {stats.paths.map(([categoryName, count], idx) => (
            <div key={idx} className="flex justify-between text-slate-300">
              <span className="truncate max-w-[120px]">{categoryName}</span>
              <span className="font-bold text-cyan-400">{count}회</span>
            </div>
          ))}
          {stats.paths.length === 0 && (
            <div className="text-center text-slate-500 text-xs">분석 기록 없음</div>
          )}
        </ul>
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="w-full pt-2 text-center text-sm font-bold text-rose-400 hover:text-rose-300 transition-colors border-t border-slate-700"
      >
        ✕ 관리자 모드 종료
      </button>
    </div>
  );
}