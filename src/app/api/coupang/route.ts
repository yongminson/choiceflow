import { NextResponse } from "next/server";

import {
  buildCoupangSearchUrl,
  CoupangApiError,
  createCoupangDeepLink,
  normalizeCoupangKeyword,
} from "@/lib/monetization/coupang-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const fetchCache = "force-no-store";

function redirectWithoutCache(
  url: string,
  mode: "api" | "fallback",
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
    console.error(
      "[coupang] Deep-link generation failed; affiliate tracking is LOST for this click.",
      details
    );
    return redirectWithoutCache(
      fallbackUrl,
      "fallback",
      `${details.code}${details.status ? `:${details.status}` : ""}`
    );
  }
}
