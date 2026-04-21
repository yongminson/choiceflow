import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/"; // 로그인 후 갈 곳 (기본 메인)

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // 성공하면 원래 가려던 페이지나 메인으로 리다이렉트
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 실패 시 에러 메시지와 함께 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}