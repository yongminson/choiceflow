import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * 이메일 인증·OAuth 등 PKCE `code` 를 세션 쿠키로 교환.
 * Route Handler 에서는 redirect 응답에 Set-Cookie 가 붙도록 setAll 에서 response 를 갱신해야 합니다.
 */
function loginRedirectWithAuthError(
  origin: string,
  code: "missing_code" | "otp_expired" | "callback_failed"
) {
  const params = new URLSearchParams();
  params.set("error_code", code);
  return NextResponse.redirect(new URL(`/login?${params.toString()}`, origin));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/";
  const redirectPath =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (!code) {
    console.error("[auth/callback] missing code");
    return loginRedirectWithAuthError(url.origin, "missing_code");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[auth/callback] missing Supabase env");
    return loginRedirectWithAuthError(url.origin, "callback_failed");
  }

  let response = NextResponse.redirect(new URL(redirectPath, url.origin));

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.redirect(new URL(redirectPath, url.origin));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession", error);
    const msg = (error.message ?? "").toLowerCase();
    const expired =
      msg.includes("expired") ||
      msg.includes("otp") ||
      msg.includes("already been") ||
      (msg.includes("invalid") &&
        (msg.includes("code") || msg.includes("token") || msg.includes("grant")));
    return loginRedirectWithAuthError(
      url.origin,
      expired ? "otp_expired" : "callback_failed"
    );
  }

  return response;
}
