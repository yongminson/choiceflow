import { createHmac, timingSafeEqual } from "node:crypto";

export const COUPANG_API_HOST = "https://api-gateway.coupang.com";
export const COUPANG_DEEPLINK_PATH =
  "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

const DEFAULT_SUB_ID = "choiceflow";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_KEYWORD_LENGTH = 120;

export type CoupangErrorCode =
  | "INVALID_KEYWORD"
  | "MISSING_CONFIGURATION"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_NETWORK"
  | "UPSTREAM_HTTP"
  | "UPSTREAM_RESPONSE";

export class CoupangApiError extends Error {
  readonly code: CoupangErrorCode;
  readonly status?: number;

  constructor(code: CoupangErrorCode, message: string, status?: number) {
    super(message);
    this.name = "CoupangApiError";
    this.code = code;
    this.status = status;
  }
}

type CoupangConfig = {
  accessKey: string;
  secretKey: string;
  subId: string;
};

type CoupangDeepLinkResponse = {
  rCode?: string;
  rMessage?: string;
  data?: Array<{
    shortenUrl?: string;
    landingUrl?: string;
    originalUrl?: string;
  }>;
};

export function formatCoupangSignedDate(date: Date): string {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

export function createCoupangAuthorization(options: {
  method: string;
  path: string;
  query?: string;
  accessKey: string;
  secretKey: string;
  now?: Date;
}): string {
  const signedDate = formatCoupangSignedDate(options.now ?? new Date());
  const message =
    signedDate +
    options.method.toUpperCase() +
    options.path +
    (options.query ?? "");
  const signature = createHmac("sha256", options.secretKey)
    .update(message)
    .digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${options.accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

export function normalizeCoupangKeyword(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_KEYWORD_LENGTH);
}

export function buildCoupangSearchUrl(keyword: string): string {
  const normalizedKeyword = normalizeCoupangKeyword(keyword);
  if (!normalizedKeyword) return "https://www.coupang.com";

  const url = new URL("https://www.coupang.com/np/search");
  url.searchParams.set("q", normalizedKeyword);
  return url.toString();
}

export function isAllowedCoupangRedirectUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (hostname === "coupa.ng" ||
        hostname === "coupang.com" ||
        hostname.endsWith(".coupang.com"))
    );
  } catch {
    return false;
  }
}

export function getCoupangConfigurationStatus() {
  const accessKeyConfigured = Boolean(
    process.env.COUPANG_ACCESS_KEY?.trim()
  );
  const secretKeyConfigured = Boolean(
    process.env.COUPANG_SECRET_KEY?.trim()
  );
  const missing: string[] = [];

  if (!accessKeyConfigured) missing.push("COUPANG_ACCESS_KEY");
  if (!secretKeyConfigured) missing.push("COUPANG_SECRET_KEY");

  return {
    configured: missing.length === 0,
    accessKeyConfigured,
    secretKeyConfigured,
    missing,
  };
}

function getCoupangConfig(): CoupangConfig {
  const accessKey = process.env.COUPANG_ACCESS_KEY?.trim() ?? "";
  const secretKey = process.env.COUPANG_SECRET_KEY?.trim() ?? "";
  const subId =
    process.env.COUPANG_SUB_ID?.trim().slice(0, 40) || DEFAULT_SUB_ID;

  if (!accessKey || !secretKey) {
    throw new CoupangApiError(
      "MISSING_CONFIGURATION",
      "Coupang Partners API credentials are not configured."
    );
  }

  return { accessKey, secretKey, subId };
}

export function hasValidDiagnosticToken(
  authorizationHeader: string | null
): boolean {
  const expected = process.env.COUPANG_DIAGNOSTIC_TOKEN?.trim() ?? "";
  const received = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : "";

  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function isDiagnosticTokenConfigured(): boolean {
  return Boolean(process.env.COUPANG_DIAGNOSTIC_TOKEN?.trim());
}

/**
 * 같은 검색어로 매번 딥링크를 새로 만들면 클릭마다 외부 API 왕복이 생기고,
 * 그 호출이 실패하면 추적 안 되는 폴백 링크로 나가 수수료가 사라진다.
 * 짧게 캐싱해 왕복과 실패 확률을 함께 줄인다.
 */
const deepLinkCache = new Map<string, { url: string; expiresAt: number }>();
const DEEPLINK_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DEEPLINK_CACHE_MAX = 500;

export async function createCoupangDeepLink(
  keyword: string
): Promise<string> {
  const normalizedKeyword = normalizeCoupangKeyword(keyword);
  if (!normalizedKeyword) {
    throw new CoupangApiError(
      "INVALID_KEYWORD",
      "A non-empty Coupang search keyword is required."
    );
  }

  const cached = deepLinkCache.get(normalizedKeyword);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  if (deepLinkCache.size > DEEPLINK_CACHE_MAX) {
    const now = Date.now();
    deepLinkCache.forEach((entry, key) => {
      if (entry.expiresAt <= now) deepLinkCache.delete(key);
    });
  }

  const config = getCoupangConfig();
  const method = "POST";
  const authorization = createCoupangAuthorization({
    method,
    path: COUPANG_DEEPLINK_PATH,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${COUPANG_API_HOST}${COUPANG_DEEPLINK_PATH}`, {
      method,
      cache: "no-store",
      redirect: "error",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({
        coupangUrls: [buildCoupangSearchUrl(normalizedKeyword)],
        subId: config.subId,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new CoupangApiError(
        "UPSTREAM_TIMEOUT",
        "Coupang Partners API timed out."
      );
    }
    throw new CoupangApiError(
      "UPSTREAM_NETWORK",
      "Coupang Partners API network request failed."
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    // 쿠팡은 실패 사유를 본문(rCode/rMessage)에 담아 준다. 본문을 버리면
    // "왜 딥링크가 안 만들어지는지"를 영영 알 수 없다. 키/권한/한도 문제를
    // 구분하려면 이 값이 필요하므로 잘라서 로그에 남긴다.
    let upstreamDetail = "";
    try {
      upstreamDetail = (await response.text()).slice(0, 300);
    } catch {
      // 본문을 못 읽어도 상태 코드만으로 계속 진행한다.
    }
    console.error("[coupang] Deep-link API HTTP error", {
      status: response.status,
      body: upstreamDetail,
    });
    throw new CoupangApiError(
      "UPSTREAM_HTTP",
      `Coupang Partners API returned HTTP ${response.status}. ${upstreamDetail}`,
      response.status
    );
  }

  let payload: CoupangDeepLinkResponse;
  try {
    payload = (await response.json()) as CoupangDeepLinkResponse;
  } catch {
    throw new CoupangApiError(
      "UPSTREAM_RESPONSE",
      "Coupang Partners API returned invalid JSON."
    );
  }

  const shortenUrl = payload.data?.[0]?.shortenUrl;
  if (payload.rCode !== "0" || !isAllowedCoupangRedirectUrl(shortenUrl)) {
    console.error("[coupang] Deep-link API rejected the request", {
      rCode: payload.rCode,
      rMessage: payload.rMessage,
      hasData: Array.isArray(payload.data),
    });
    throw new CoupangApiError(
      "UPSTREAM_RESPONSE",
      `Coupang Partners API returned rCode=${payload.rCode ?? "?"} ${
        payload.rMessage ?? ""
      }`.trim()
    );
  }

  deepLinkCache.set(normalizedKeyword, {
    url: shortenUrl,
    expiresAt: Date.now() + DEEPLINK_CACHE_TTL_MS,
  });
  return shortenUrl;
}
