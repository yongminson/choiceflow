"use client";

import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/components/auth/use-supabase-user";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const user = useSupabaseUser();
  const [logs, setLogs] = useState<any[]>([]);

  // 🔥 아까 쓰셨던 대표님의 카카오 로그인 이메일을 똑같이 넣어주세요!
  const ADMIN_EMAIL = "여기에_대표님_이메일@naver.com";

  useEffect(() => {
    // 대표님이 맞을 때만 기록을 불러옵니다.
    if (user?.email === ADMIN_EMAIL) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("visitor_logs")
      .select("*")
      .order("created_at", { ascending: false }) // 최신순 정렬
      .limit(100); // 최근 100개만 가져오기
    if (data) setLogs(data);
  };

  // 일반 유저 접근 컷!
  if (!user) return <div className="p-10 font-bold text-red-500">로그인이 필요합니다.</div>;
  if (user.email !== ADMIN_EMAIL) return <div className="p-10 font-bold text-red-500">접근 권한이 없습니다! (관리자 전용)</div>;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto pt-24">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">🕵️‍♂️ 운영자 전용: 실시간 방문자 추적기</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600">접속 시간</th>
              <th className="p-4 font-semibold text-slate-600">액션</th>
              <th className="p-4 font-semibold text-slate-600">접속한 경로(메뉴)</th>
              <th className="p-4 font-semibold text-slate-600">유저 ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-4">
                  <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider">
                    {log.action_type}
                  </span>
                </td>
                <td className="p-4 font-medium text-blue-600">{log.path}</td>
                <td className="p-4 text-xs text-slate-400 font-mono">
                  {log.user_id ? "✅ 로그인 회원" : "익명 방문자"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-10 text-center text-slate-500">아직 수집된 방문 기록이 없습니다.</div>
        )}
      </div>
    </div>
  );
}