import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // 1. 현재 요청을 보낸 유저가 로그인된 본인이 맞는지 확인합니다.
    const supabaseClient = createRouteHandlerSupabaseClient(request);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "로그인 세션이 유효하지 않습니다." }, { status: 401 });
    }

    // 2. 계정 삭제는 '관리자 권한(Service Role Key)'이 필요합니다.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. 유저 계정 삭제
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("회원 탈퇴 에러:", deleteError.message);
      return NextResponse.json({ ok: false, error: "회원 탈퇴에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("서버 에러:", error);
    return NextResponse.json({ ok: false, error: "서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}