import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

// 일반 서버 컴포넌트 및 Server Action용
export async function createClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서 쿠키 설정 불가 시 무시
          }
        },
      },
    }
  );
}

// ✅ API 라우트(Route Handler) 전용 - 요청(request)에서 쿠키를 읽어옴
export function createRouteHandlerSupabaseClient(request: NextRequest | Request) {
  const req = request as NextRequest;
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // request 객체에 담긴 쿠키를 직접 읽어옵니다.
          return req.cookies.getAll();
        },
        setAll() {
          // API 라우트에서는 읽기 전용으로 사용하거나 별도의 응답 객체에 담아야 함
        },
      },
    }
  );
}