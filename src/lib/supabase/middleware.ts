import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 보호 경로 정책
 * - `/`, `/result`, `/api/*` : 로그인 필요 (API는 쿠키 기반 세션 없으면 401)
 * - 비로그인 사용자에게 보여줄 "초기 메인"은 별도 공개 랜딩을 두지 않고,
 *   로그인 페이지(`/login`)를 첫 화면으로 사용합니다. (랜딩이 필요하면 `/`를
 *   공개로 바꾸고 앱만 `/app` 등으로 옮기면 됩니다.)
 */
const PROTECTED_PREFIXES = ["/result"];

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/mypage")) return true;
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAuthPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/login/")
  );
}

/** 이메일 링크 등 — 세션 교환 전에는 user 가 없을 수 있음. 차단 금지. */
function isAuthCallbackPath(pathname: string): boolean {
  return pathname === "/auth/callback" || pathname.startsWith("/auth/callback/");
}

/**
 * 세션 갱신 + 보호 경로에서 미로그인 시 /login 으로 이동.
 * 로그인된 사용자가 /login 접근 시 홈으로 보냄.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      "[middleware] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 가 없습니다."
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /* 로그인 상태에서 /login 만 비우고, /auth/callback 은 code 교환 라우트이므로 건너뜀 */
  if (
    user &&
    isAuthPath(pathname) &&
    !isAuthCallbackPath(pathname)
  ) {
    const next = request.nextUrl.searchParams.get("next");
    const safe =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return NextResponse.redirect(new URL(safe, request.url));
  }

  if (!user && isProtectedPath(pathname)) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
