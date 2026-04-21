import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code"); // 여기서 드디어 ?code= 를 읽어냅니다!
  
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // 로그인 성공 시 메인 화면('/')으로 당당하게 입장!
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // 에러 나면 로그인 창으로
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}