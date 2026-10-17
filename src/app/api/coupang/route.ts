import { NextResponse } from "next/server";

import {
  buildCoupangSearchUrl,
  CoupangApiError,
  createCoupangDeepLink,
  normalizeCoupangKeyword,
  searchCoupangProduct,
} from "@/lib/monetization/coupang-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const fetchCache = "force-no-store";

function redirectWithoutCache(
  url: string,
  mode: "api" | "search" | "fallback",
  reason?: string
) {
  const response = NextResponse.redirect(url, 302);
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );
  response.headers.set("X-ChoiceFlow-Coupang-Mode", mode);
  // fallback 으로 나가면 제휴 추적이 전혀 되지 않아 수수료가 0이 된다.
  // 왜 실패했는지 응답 헤더에서 바로 확인할 수 있어야 한다.
  if (reason) {
    response.headers.set(
      "X-ChoiceFlow-Coupang-Reason",
      reason.replace(/[^\x20-\x7E]/g, " ").slice(0, 120)
    );
  }
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = normalizeCoupangKeyword(searchParams.get("q"));
  const fallbackUrl = buildCoupangSearchUrl(keyword);

  if (!keyword) {
    return redirectWithoutCache(fallbackUrl, "fallback", "EMPTY_KEYWORD");
  }

  try {
    const deepLink = await createCoupangDeepLink(keyword);
    return redirectWithoutCache(deepLink, "api");
  } catch (error) {
    const details =
      error instanceof CoupangApiError
        ? { code: error.code, status: error.status, message: error.message }
        : { code: "UNEXPECTED_ERROR", message: String(error) };
    const reason = `${details.code}${details.status ? `:${details.status}` : ""}`;

    /*
      딥링크가 안 되면 바로 일반 쿠팡 검색으로 보내지 않는다. 그 주소에는
      추적 표시가 없어 눌러도 수수료가 0 이다. 상품 검색은 딥링크와 다른
      창구라 따로 살아 있을 수 있고, 검색이 돌려주는 상품 주소에는 추적
      표시와 채널이 붙어 있다. 그것으로 한 번 더 시도한다.
    */
    try {
      const product = await searchCoupangProduct(keyword);
      if (product?.productUrl) {
        console.warn("[coupang] Deep-link failed; sent to tracked product link instead.", details);
        return redirectWithoutCache(product.productUrl, "search", reason);
      }
    } catch (searchError) {
      console.error("[coupang] Product search fallback also failed.", String(searchError));
    }

    console.error(
      "[coupang] Deep-link generation failed; affiliate tracking is LOST for this click.",
      details
    );
    return redirectWithoutCache(
      fallbackUrl,
      "fallback",
      reason
    );
  }
}
