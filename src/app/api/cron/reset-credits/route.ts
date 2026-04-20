import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge"; // Vercel 환경에서 실행 속도를 높이기 위한 설정

export async function GET(request: Request) {
  try {
    // 1. Vercel에서 보낸 요청인지 암호(CRON_SECRET) 확인
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
    }

    // 2. 관리자 권한으로 DB 연결
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. 크레딧 0개인 유저만 1개로 충전
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ credits: 1 })
      .lt("credits", 1);

    if (error) {
      console.error("크레딧 충전 중 에러:", error);
      return NextResponse.json({ error: "DB 업데이트 실패" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "일일 무료 크레딧 충전 완료!" });
  } catch (error) {
    console.error("Cron 서버 에러:", error);
    return NextResponse.json({ error: "서버 내부 오류" }, { status: 500 });
  }
}