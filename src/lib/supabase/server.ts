import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getEnvOrThrow(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다."
    );
  }
  return { url, key };
}

/** Cookie 헤더 문자열 → { name, value }[] (첫 번째 '=' 기준 분리) */
function parseCookieHeader(header: string | null): { name: string; value: string }[] {
  if (!header?.trim()) return [];
  return header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const i = part.indexOf("=");
    if (i === -1) return { name: part, value: "" };
    const name = part.slice(0, i).trim();
    const raw = part.slice(i + 1).trim();
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      value = raw;
    }
    return { name, value };
  });
}

/**
 * next/headers cookies() 값과 HTTP Cookie 헤더를 병합.
 * Route Handler에서 `cookies()`가 비어 있어도 요청 헤더에 세션 쿠키가 있으면 Supabase가 읽을 수 있게 함.
 * 동일 이름이면 cookieStore(Next) 쪽이 우선.
 */
function mergeCookiesForSupabase(
  fromStore: { name: string; value: string }[],
  fromRequestHeader: { name: string; value: string }[]
): { name: string; value: string }[] {
  const map = new Map<string, string>();
  for (const c of fromRequestHeader) map.set(c.name, c.value);
  for (const c of fromStore) map.set(c.name, c.value);
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

/** 서버 컴포넌트 등 — Request 객체가 없을 때 */
export function createServerSupabaseClient() {
  const { url, key } = getEnvOrThrow();
  const cookieStore = cookies();

  return createServerClient(url, key, {
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
          /* Server Component 등에서 set 불가한 경우 무시 */
        }
      },
    },
  });
}

/**
 * Route Handler 전용 — `cookies()` + `request.headers.get("cookie")` 병합으로 세션 유실 방지.
 * POST(request) 등에서 반드시 이 함수를 사용하세요.
 */
export function createRouteHandlerSupabaseClient(request: Request) {
  const { url, key } = getEnvOrThrow();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        const cookieStore = cookies();
        const fromStore = cookieStore.getAll();
        const fromHeader = parseCookieHeader(request.headers.get("cookie"));
        return mergeCookiesForSupabase(fromStore, fromHeader);
      },
      setAll(cookiesToSet) {
        try {
          const cookieStore = cookies();
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* Route Handler에서 set 불가한 경우 무시 — 미들웨어가 세션 갱신 */
        }
      },
    },
  });
}
