import { createHmac, timingSafeEqual } from "node:crypto";

import {
  isWrongAudience,
  type DetectedAudience,
} from "../recommendation/gender.ts";
import {
  matchesTargetItem,
  type TargetItem,
} from "../recommendation/item-match.ts";
import { productBrandKey } from "./brand-verify.ts";
import {
  isWrongOccasion,
  type Occasion,
} from "../recommendation/occasion.ts";

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

export const COUPANG_SEARCH_PATH =
  "/v2/providers/affiliate_open_api/apis/openapi/products/search";

export type CoupangProduct = {
  /** 쿠팡이 매기는 상품 번호. 같은 상품인지 가리는 기준이다. */
  productId?: string;
  productName: string;
  productPrice: number;
  productImage: string;
  /** 이미 제휴 추적이 포함된 상품 상세 링크 */
  productUrl: string;
  isRocket: boolean;
  isFreeShipping: boolean;
};

/**
 * 같은 상품인지 가릴 때 쓰는 값들.
 *
 * 상품 주소만으로는 부족하다. 제휴 딥링크에는 호출마다 달라지는 추적
 * 파라미터가 붙어, 같은 상품인데 주소가 달라 중복 검사를 빠져나간다.
 * 상품 번호를 먼저 보고, 썸네일도 함께 본다. 판매자만 다른 같은 물건은
 * 번호가 갈리지만 사진이 같아서, 화면에서는 그냥 같은 상품으로 보인다.
 */
export function productDedupKeys(product: CoupangProduct): string[] {
  return [
    product.productId && `id:${product.productId}`,
    product.productUrl && `url:${product.productUrl}`,
    product.productImage && `img:${product.productImage}`,
  ].filter((key): key is string => Boolean(key));
}

type CoupangSearchResponse = {
  rCode?: string;
  rMessage?: string;
  data?: {
    productData?: Array<{
      productId?: number | string;
      productName?: string;
      productPrice?: number;
      productImage?: string;
      productUrl?: string;
      isRocket?: boolean;
      isFreeShipping?: boolean;
    }>;
  };
};

const productCache = new Map<
  string,
  { product: CoupangProduct | null; expiresAt: number }
>();
const PRODUCT_CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const PRODUCT_CACHE_MAX = 500;

/**
 * 검색어로 대표 상품 1개를 찾는다.
 *
 * 검색 페이지 딥링크보다 상품 상세 링크가 전환·추적 모두 유리하다.
 * 응답의 productUrl 에는 제휴 추적 정보가 이미 포함되어 있다.
 * 실패하면 null 을 돌려주고 호출부가 기존 딥링크로 넘어가게 한다.
 */
export async function searchCoupangProduct(
  keyword: string,
  maxPriceWon?: number,
  options: {
    /**
     * 이미 다른 후보에 쓴 상품을 가리키는 값들(productDedupKeys 로 만든다).
     * 검색어가 달라도 같은 상품이 걸리는 일이 있어, 슬롯이 겹치지 않도록 뺀다.
     */
    excludeKeys?: ReadonlySet<string>;
    /**
     * 누가 쓸 것인지 정해진 요청에서 대상이 다른 상품을 빼기 위한 조건.
     * 옷·선물은 성별이나 연령이 어긋나면 그 추천 자체가 못 쓰는 것이 된다.
     */
    audience?: DetectedAudience;
    /**
     * 찾는 품목. 니트를 찾는 사람에게 팔토시나 바지를 보여주지 않는다.
     * 관련성을 먼저 보고, 그 안에서 중복을 걸러야 후보가 엉뚱해지지 않는다.
     */
    targetItem?: TargetItem;
    /**
     * 이미 자리를 채운 브랜드. 한 브랜드가 화면을 다 차지하지 않게 막는다.
     */
    excludeBrands?: ReadonlySet<string>;
    /**
     * 언제·어떤 자리에 쓸 것인지. 추석 시댁 모임에 여름 상품이 걸린 적이 있다.
     */
    occasion?: Occasion;
  } = {}
): Promise<CoupangProduct | null> {
  const normalizedKeyword = normalizeCoupangKeyword(keyword);
  if (!normalizedKeyword) return null;

  const excluded = options.excludeKeys;
  // 제외 목록이 있으면 결과가 달라질 수 있으므로 캐시를 쓰지 않는다.
  const useCache =
    (!excluded || excluded.size === 0) &&
    (!options.excludeBrands || options.excludeBrands.size === 0);
  const cacheKey = `${normalizedKeyword}|${maxPriceWon ?? ""}|${options.audience?.term ?? ""}|${options.targetItem?.name ?? ""}|${options.occasion?.season ?? ""}${options.occasion?.formal ? "-formal" : ""}`;
  const cached = useCache ? productCache.get(cacheKey) : undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.product;
  if (productCache.size > PRODUCT_CACHE_MAX) {
    const now = Date.now();
    productCache.forEach((entry, key) => {
      if (entry.expiresAt <= now) productCache.delete(key);
    });
  }

  let config: CoupangConfig;
  try {
    config = getCoupangConfig();
  } catch {
    return null;
  }

  const query = `keyword=${encodeURIComponent(normalizedKeyword)}&limit=10`;
  const authorization = createCoupangAuthorization({
    method: "GET",
    path: COUPANG_SEARCH_PATH,
    query,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${COUPANG_API_HOST}${COUPANG_SEARCH_PATH}?${query}`,
      {
        method: "GET",
        cache: "no-store",
        headers: { Authorization: authorization },
        signal: controller.signal,
      }
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[coupang] Product search HTTP error", {
        status: response.status,
        body: detail.slice(0, 200),
      });
      return null;
    }
    const payload = (await response.json()) as CoupangSearchResponse;
    if (payload.rCode !== "0") {
      console.error("[coupang] Product search rejected", {
        rCode: payload.rCode,
        rMessage: payload.rMessage,
      });
      return null;
    }

    const items = payload.data?.productData ?? [];
    const isExcluded = (item: (typeof items)[number]) => {
      if (!excluded || excluded.size === 0) return false;
      return productDedupKeys({
        productId: item.productId === undefined ? undefined : String(item.productId),
        productName: "",
        productPrice: 0,
        productImage: String(item.productImage ?? ""),
        productUrl: String(item.productUrl ?? ""),
        isRocket: false,
        isFreeShipping: false,
      }).some((key) => excluded.has(key));
    };
    /*
      대상이 다른 상품을 뺀다. "남아 운동화"를 찾는데 분홍색 여아 캐릭터
      상품이 걸리거나, "여성 니트"를 찾는데 아동복이 걸리는 일을 막는다.
    */
    const isWrongGender = (item: (typeof items)[number]) =>
      options.audience
        ? isWrongAudience(String(item.productName ?? ""), options.audience)
        : false;

    /*
      관련성을 중복 제거보다 먼저 본다. 순서가 바뀌면 "서로 다른 상품"을
      맞추려다 요청과 무관한 품목까지 후보로 올라온다.
    */
    const isWrongItem = (item: (typeof items)[number]) =>
      !matchesTargetItem(String(item.productName ?? ""), options.targetItem);

    // 자리를 다 채운 브랜드는 건너뛴다. 품목·대상을 먼저 보고 그다음이다.
    const isCappedBrand = (item: (typeof items)[number]) => {
      const brands = options.excludeBrands;
      if (!brands || brands.size === 0) return false;
      return brands.has(productBrandKey(String(item.productName ?? "")));
    };

    // 계절과 자리가 어긋나는 상품도 뺀다. 품목·대상 다음, 브랜드보다 먼저다.
    const isWrongTime = (item: (typeof items)[number]) =>
      options.occasion
        ? isWrongOccasion(String(item.productName ?? ""), options.occasion)
        : false;

    const isUsable = (item: (typeof items)[number]) =>
      Boolean(item.productUrl) &&
      Boolean(item.productName) &&
      isAllowedCoupangRedirectUrl(String(item.productUrl)) &&
      !isWrongItem(item) &&
      !isWrongGender(item) &&
      !isWrongTime(item) &&
      !isCappedBrand(item) &&
      !isExcluded(item);

    const picked = items.find((item) => {
      if (!isUsable(item)) return false;
      const price = Number(item.productPrice);
      if (!Number.isFinite(price) || price <= 0) return false;
      return !maxPriceWon || price <= maxPriceWon;
    });
    // 예산을 넘더라도 아예 없는 것보다는 대표 상품 하나를 보여준다.
    const chosen = picked ?? items.find(isUsable);
    if (!chosen) {
      if (useCache) productCache.set(cacheKey, { product: null, expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS });
      return null;
    }

    const product: CoupangProduct = {
      productId:
        chosen.productId === undefined ? undefined : String(chosen.productId),
      productName: String(chosen.productName).slice(0, 120),
      productPrice: Number(chosen.productPrice) || 0,
      productImage: String(chosen.productImage ?? ""),
      productUrl: String(chosen.productUrl),
      isRocket: Boolean(chosen.isRocket),
      isFreeShipping: Boolean(chosen.isFreeShipping),
    };
    if (useCache) {
      productCache.set(cacheKey, {
        product,
        expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS,
      });
    }
    return product;
  } catch (error) {
    console.error("[coupang] Product search failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
