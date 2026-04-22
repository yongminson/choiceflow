import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // 로그인 후 돌아갈 기본 경로는 메인 화면('/')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    // 🌟 우리가 만든 최신 서버 클라이언트를 불러옵니다
    const supabase = await createClient()
    
    // 가져온 암호(code)를 진짜 로그인 세션(쿠키)으로 교환합니다
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 에러 없이 교환 성공하면 메인 화면으로 입장!
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 코드가 없거나 에러가 났다면 다시 로그인 창으로
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
}