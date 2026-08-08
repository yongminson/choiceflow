import { NextResponse } from "next/server";

import {
  createCoupangDeepLink,
  getCoupangConfigurationStatus,
  hasValidDiagnosticToken,
  isDiagnosticTokenConfigured,
  normalizeCoupangKeyword,
  searchCoupangProduct,
} from "@/lib/monetization/coupang-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * 제휴 링크가 어느 단계에서 끊기는지 한 번에 확인하는 진단 엔드포인트.
 *
 * 리포트에 클릭이 잡히지 않을 때 원인이 키인지, 권한인지, 링크 형태인지
 * 구분할 방법이 없어 추가했다. 응답에 키 값은 절대 포함하지 않는다.
 *
 * 사용: GET /api/coupang/diagnose?q=검색어
 *       Authorization: Bearer <COUPANG_DIAGNOSTIC_TOKEN>
 */
export async function GET(request: Request) {
  if (!isDiagnosticTokenConfigured()) {
    return NextResponse.json(
      { ok: false, code: "DIAGNOSTIC_TOKEN_MISSING" },
      { status: 503, headers: NO_STORE }
    );
  }
  if (!hasValidDiagnosticToken(request.headers.get("authorization"))) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED" },
      { status: 401, headers: NO_STORE }
    );
  }

  const { searchParams } = new URL(request.url);
  const keyword =
    normalizeCoupangKeyword(searchParams.get("q")) || "보온 스테인리스 텀블러";

  const configuration = getCoupangConfigurationStatus();

  // 1) 상품 검색 — 성공하면 상품 상세 직링크를 쓰게 된다.
  let productStep: Record<string, unknown>;
  try {
    const product = await searchCoupangProduct(keyword);
    productStep = product
      ? {
          ok: true,
          productName: product.productName,
          productPrice: product.productPrice,
          hasImage: Boolean(product.productImage),
          isRocket: product.isRocket,
          urlHost: new URL(product.productUrl).host,
          urlPath: new URL(product.productUrl).pathname.slice(0, 60),
        }
      : { ok: false, reason: "NO_PRODUCT_OR_API_FAILED" };
  } catch (error) {
    productStep = {
      ok: false,
      reason: error instanceof Error ? error.message.slice(0, 200) : "UNKNOWN",
    };
  }

  // 2) 딥링크 — 상품 검색이 실패했을 때 쓰이는 경로.
  let deepLinkStep: Record<string, unknown>;
  try {
    const url = await createCoupangDeepLink(keyword);
    deepLinkStep = { ok: true, urlHost: new URL(url).host };
  } catch (error) {
    deepLinkStep = {
      ok: false,
      reason: error instanceof Error ? error.message.slice(0, 200) : "UNKNOWN",
    };
  }

  const linkMode = productStep.ok
    ? "product-detail"
    : deepLinkStep.ok
      ? "deeplink-search"
      : "no-tracking-fallback";

  return NextResponse.json(
    {
      ok: true,
      keyword,
      configuration: {
        configured: configuration.configured,
        missing: configuration.missing,
        subIdConfigured: Boolean(process.env.COUPANG_SUB_ID?.trim()),
      },
      productSearch: productStep,
      deepLink: deepLinkStep,
      // 실제로 사용자에게 나가는 링크 종류
      linkMode,
      hint:
        linkMode === "no-tracking-fallback"
          ? "두 경로 모두 실패했습니다. 이 상태에서는 제휴 추적이 되지 않습니다."
          : linkMode === "deeplink-search"
            ? "상품 검색이 실패해 검색 페이지 딥링크로 나갑니다. 추적은 되지만 전환은 낮습니다."
            : "상품 상세 직링크로 나갑니다. 정상입니다.",
    },
    { headers: NO_STORE }
  );
}
