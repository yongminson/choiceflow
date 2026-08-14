/**
 * 유입 출처 판별.
 *
 * visitor_logs 는 경로(path)만 남기고 있어서 방문자가 어디서 왔는지 알 수 없었다.
 * 명운/위스퍼와 같은 기준으로 출처를 분류해 본사 대시보드에서 나란히 비교한다.
 */

export type Attribution = {
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  app_mode: "web" | "twa" | "pwa" | "ios_pwa";
  landing_path: string;
};

const STORAGE_KEY = "cf_attr";

// 설치형(TWA/PWA)으로 들어오면 referrer 가 비거나 android-app:// 로 온다.
// 구분하지 않으면 앱 유입과 직접 유입이 뭉뚱그려진다.
function detectAppMode(): Attribution["app_mode"] {
  try {
    if (document.referrer.startsWith("android-app://")) return "twa";
    if (window.matchMedia("(display-mode: standalone)").matches) return "pwa";
    if ((window.navigator as { standalone?: boolean }).standalone === true) return "ios_pwa";
    return "web";
  } catch {
    return "web";
  }
}

// utm 태그가 없는 유입도 referrer 도메인으로 최소 분류한다.
function inferSource(referrer: string | null): string | null {
  if (!referrer) return detectAppMode() === "web" ? "(direct)" : "(app)";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host === window.location.hostname) return null; // 내부 이동은 유입이 아님
    return host;
  } catch {
    return "(unknown)";
  }
}

/** 세션 첫 진입 시 한 번만 계산하고, 이후에는 저장된 값을 재사용한다. */
export function getAttribution(): Attribution {
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached) return JSON.parse(cached) as Attribution;
  } catch {
    // 저장소를 못 쓰면 매번 새로 계산한다
  }

  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || null;
  const parsed: Attribution = {
    referrer,
    utm_source: params.get("utm_source") || inferSource(referrer),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    app_mode: detectAppMode(),
    landing_path: window.location.pathname,
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // 저장 실패는 무시
  }
  return parsed;
}

/** 이 세션에서 아직 유입 기록을 남기지 않았는지 확인하고, 남길 차례면 true. */
export function claimSessionStart(): boolean {
  try {
    if (sessionStorage.getItem("cf_session_logged")) return false;
    sessionStorage.setItem("cf_session_logged", "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * 세션 식별자.
 *
 * visitor_logs 에는 session_id 컬럼이 없어 "한 사람이 몇 페이지를 봤는지"를
 * 셀 수 없었다. 컬럼 추가 없이 details 안에 실어 보내 세션 단위 분석을
 * 명운·위스퍼와 같은 기준으로 맞춘다.
 */
export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem("cf_sid");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("cf_sid", id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}
